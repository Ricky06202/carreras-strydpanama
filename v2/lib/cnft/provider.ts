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
      return await mintWithBubblegum(mod, umiMod, args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        provider: "bubblegum",
        mock: false,
        error:
          "mint real no disponible: " +
          msg.slice(0, 160) +
          " (instala las deps de Solana y configura tesoreria/tree; ver v2/docs/cupos-cnft.md)",
      };
    }
  },
};

/** Mint v1 de Bubblegum. Solo se ejecuta en modo live. */
async function mintWithBubblegum(
  mod: Record<string, any>,
  umiMod: Record<string, any>,
  args: MintArgs,
): Promise<MintOutcome> {
  const { mintV1, mplBubblegum } = mod;
  const rpc =
    args.rpcUrl ??
    (args.network === "mainnet" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
  const umi = umiMod.createUmi(rpc);
  umi.use(mplBubblegum());
  const signer = umi.eddsa.createKeypairFromSecretKey(treasurySecretBytes(args.treasurySecret as string));
  umi.use({
    install(api: Record<string, unknown>) {
      api.identity = signer;
      api.payer = signer;
      return api;
    },
  });
  const builder = mintV1(umi, {
    leafOwner: args.ownerAddress,
    merkleTree: args.treeAddress,
    metadata: {
      name: String((args.metadata as { name?: string })?.name ?? "Cupo").slice(0, 32),
      uri: args.metadataUri,
      sellerFeeBasisPoints: 0,
      collection: null,
      creators: [],
    },
  });
  const result = await builder.sendAndConfirm(umi);
  const sig = result?.signature ? base58Encode(new Uint8Array(result.signature)) : undefined;
  return { ok: true, provider: "bubblegum", mock: false, assetId: sig, signature: sig, treeAddress: args.treeAddress };
}

export function getProvider(mode: "off" | "mock" | "live"): CnftProvider {
  return mode === "live" ? bubblegumProvider : mockProvider;
}
