// Capa de abstraccion del emisor del cupo (cNFT comprimido en Solana).
//
//  - mockProvider     : simulado, determinista, sin red ni costo. Es el que corre
//                       hoy: no hay wallet de tesoreria con SOL ni merkle tree.
//  - bubblegumProvider: mint REAL con Metaplex Bubblegum (mpl-bubblegum + umi).
//                       Punto de entrada listo; requiere instalar las deps y tener
//                       tesoreria + tree (ver v2/docs/cupos-cnft.md). Si las deps no
//                       estan, devuelve error explicativo en vez de romper el build.
import { base58Decode, base58Encode } from "./base58";

export interface MintArgs {
  network: "devnet" | "mainnet" | "mock";
  ownerAddress: string;
  metadataUri: string;
  metadata: unknown;
  registrationId: string;
  confirmationCode: string;
  nonTransferable: boolean;
  treasurySecret?: string;
  treeAddress?: string;
  rpcUrl?: string;
}

export interface MintOutcome {
  ok: boolean;
  provider: string;
  mock: boolean;
  assetId?: string;
  signature?: string;
  treeAddress?: string;
  error?: string;
}

export interface CnftProvider {
  name: string;
  live: boolean;
  mint(args: MintArgs): Promise<MintOutcome>;
}

async function sha256Bytes(...parts: string[]): Promise<Uint8Array> {
  const data = new TextEncoder().encode(parts.join("|"));
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

/** Id simulado con la FORMA de un asset id de Solana (base58 de 32 bytes). */
export async function mockAssetId(...parts: string[]): Promise<string> {
  return base58Encode(await sha256Bytes("rsanjur-cnft-mock", ...parts));
}

export const mockProvider: CnftProvider = {
  name: "mock",
  live: false,
  async mint(args: MintArgs): Promise<MintOutcome> {
    return {
      ok: true,
      provider: "mock",
      mock: true,
      assetId: await mockAssetId(args.registrationId, args.confirmationCode),
      signature: await mockAssetId("sig", args.registrationId),
      treeAddress: args.treeAddress,
    };
  },
};

/** Bubblegum limita el nombre on-chain a 32 BYTES (no caracteres): un acento o un
 *  simbolo ocupa mas de uno, asi que se corta por bytes y no con .slice(). */
function truncateUtf8(value: string, maxBytes: number): string {
  const enc = new TextEncoder();
  let out = "";
  for (const ch of value) {
    if (enc.encode(out + ch).length > maxBytes) break;
    out += ch;
  }
  return out;
}

/** Secreto de tesoreria: acepta base58 (64 bytes) o JSON [..] de solana-keygen. */
export function treasurySecretBytes(secret: string): Uint8Array {
  const trimmed = (secret ?? "").trim();
  if (trimmed.startsWith("[")) return Uint8Array.from(JSON.parse(trimmed) as number[]);
  return base58Decode(trimmed);
}

export const bubblegumProvider: CnftProvider = {
  name: "bubblegum",
  live: true,
  async mint(args: MintArgs): Promise<MintOutcome> {
    if (!args.treasurySecret || !args.treeAddress) {
      return { ok: false, provider: "bubblegum", mock: false, error: "falta tesoreria o merkle tree" };
    }
    try {
      const mod: Record<string, any> = await import("@metaplex-foundation/mpl-bubblegum");
      const umiMod: Record<string, any> = await import("@metaplex-foundation/umi-bundle-defaults");
      const umiCore: Record<string, any> = await import("@metaplex-foundation/umi");
      return await mintWithBubblegum(mod, umiMod, umiCore, args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        provider: "bubblegum",
        mock: false,
        error:
          "mint real no disponible: " +
          msg.slice(0, 400) +
          " (instala las deps de Solana y configura tesoreria/tree; ver v2/docs/cupos-cnft.md)",
      };
    }
  },
};

/** Espera la confirmacion por HTTP (getSignatureStatuses).
 *  NO se usa web3.js confirmTransaction: con Helius devuelve un
 *  lastValidBlockHeight viejo y tira "Signature ... has expired: block height
 *  exceeded" aunque la transaccion SI haya entrado en la cadena. */
async function confirmSignature(
  umi: { rpc: { getSignatureStatuses: (s: Uint8Array[]) => Promise<Array<{ error?: unknown; commitment?: string | null } | null>> } },
  signatureBytes: Uint8Array,
  timeoutMs = 90_000,
): Promise<void> {
  const started = Date.now();
  for (;;) {
    const [status] = await umi.rpc.getSignatureStatuses([signatureBytes]);
    if (status?.error) throw new Error("la transaccion fallo en la cadena: " + JSON.stringify(status.error).slice(0, 200));
    if (status?.commitment === "confirmed" || status?.commitment === "finalized") return;
    if (Date.now() - started > timeoutMs) throw new Error("la transaccion no confirmo a tiempo");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** El asset id REAL de un cNFT comprimido (la PDA hoja) NO es la firma: Bubblegum
 *  lo imprime en los logs del programa ("Leaf asset ID: ..."). Se lee por RPC crudo
 *  porque el adaptador umi/web3js no expone meta.logMessages. */
async function assetIdFromLogs(rpcUrl: string, signature: string): Promise<string | undefined> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "json", maxSupportedTransactionVersion: 0 }],
      }),
    });
    const json = (await res.json()) as { result?: { meta?: { logMessages?: string[] } } };
    for (const line of json.result?.meta?.logMessages ?? []) {
      const m = line.match(/Leaf asset ID:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/);
      if (m) return m[1];
    }
  } catch {
    /* sin asset id */
  }
  return undefined;
}

/** Mint v1 de Bubblegum. Solo se ejecuta en modo live. */
async function mintWithBubblegum(
  mod: Record<string, any>,
  umiMod: Record<string, any>,
  umiCore: Record<string, any>,
  args: MintArgs,
): Promise<MintOutcome> {
  const { mintV1, mplBubblegum, parseLeafFromMintV1Transaction, findLeafAssetIdPda } = mod;
  const rpc =
    args.rpcUrl ??
    (args.network === "mainnet" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
  const umi = umiMod.createUmi(rpc);
  umi.use(mplBubblegum());
  // OJO: un Keypair NO es un Signer. Hay que envolverlo con createSignerFromKeypair,
  // si no sendAndConfirm falla con "signer.signTransaction is not a function".
  const keypair = umi.eddsa.createKeypairFromSecretKey(treasurySecretBytes(args.treasurySecret as string));
  const signer = umiCore.createSignerFromKeypair(umi, keypair);
  umi.use(umiCore.signerIdentity(signer));
  const builder = mintV1(umi, {
    leafOwner: args.ownerAddress,
    merkleTree: args.treeAddress,
    metadata: {
      name: truncateUtf8(String((args.metadata as { name?: string })?.name ?? "Cupo"), 32),
      uri: args.metadataUri,
      sellerFeeBasisPoints: 0,
      collection: null,
      creators: [],
    },
  });
  // Firmar/enviar con el ultimo blockhash y confirmar por HTTP (ver confirmSignature).
  const signatureBytes = await (await builder.setLatestBlockhash(umi)).send(umi);
  const signature = base58Encode(new Uint8Array(signatureBytes));
  await confirmSignature(umi, signatureBytes);
  // El asset id REAL (PDA hoja). Primero por logs; si no, parseando la hoja.
  // Nunca se guarda la firma como si fuera el asset id.
  let assetId: string | undefined;
  if (signature) {
    assetId = await assetIdFromLogs(rpc, signature);
    if (!assetId) {
      try {
        const leaf = await parseLeafFromMintV1Transaction(umi, signature);
        assetId = findLeafAssetIdPda(umi, { merkleTree: args.treeAddress, leafIndex: leaf.nonce }).toString();
      } catch {
        /* queda sin asset id */
      }
    }
  }
  return {
    ok: true,
    provider: "bubblegum",
    mock: false,
    assetId,
    signature,
    treeAddress: args.treeAddress,
  };
}

export function getProvider(mode: "off" | "mock" | "live"): CnftProvider {
  return mode === "live" ? bubblegumProvider : mockProvider;
}
