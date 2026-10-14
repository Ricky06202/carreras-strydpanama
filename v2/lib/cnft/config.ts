// Configuracion del cupo digital (cNFT comprimido). TODO por entorno.
// Reglas duras:
//  - Sin CNFT_RED no se hace NADA (la inscripcion funciona igual que hoy).
//  - Devnet por defecto; mainnet SOLO con CNFT_MAINNET_OK=1 explicito.
//  - Sin tesoreria o sin CNFT_WALLET_KEY -> emision SIMULADA (mock), jamas se rompe nada.
import { env } from "cloudflare:workers";

export type CnftNetwork = "devnet" | "mainnet";
export type CnftMode = "off" | "mock" | "live";

export interface CnftConfig {
  network: CnftNetwork;
  /** Hay intencion de emitir (flag puesto + clave de cifrado). */
  enabled: boolean;
  /** off = no tocar nada | mock = cupo simulado | live = mint real en la cadena. */
  mode: CnftMode;
  walletKeyConfigured: boolean;
  treasuryConfigured: boolean;
  treeConfigured: boolean;
  mainnetUnlocked: boolean;
  treeAddress: string | null;
  provider: string;
  /** Motivos por los que no se puede hacer mint real (vacio = se puede). */
  reasons: string[];
}

type EnvLike = Record<string, string | undefined>;

export function readCnftEnv(): EnvLike {
  try {
    return (env ?? {}) as unknown as EnvLike;
  } catch {
    return {};
  }
}

function truthy(v: string | undefined): boolean {
  return /^(1|true|si|sí|yes|on)$/i.test((v ?? "").trim());
}

export function cnftConfig(source: EnvLike = readCnftEnv()): CnftConfig {
  const raw = (source.CNFT_RED ?? "").trim().toLowerCase();
  const network: CnftNetwork = raw === "mainnet" ? "mainnet" : "devnet";
  const flagOn = raw === "devnet" || raw === "mainnet";
  const mainnetUnlocked = truthy(source.CNFT_MAINNET_OK);
  const walletKeyConfigured = !!(source.CNFT_WALLET_KEY ?? "").trim();
  const treasuryConfigured = !!(source.CNFT_TREASURY_SECRET ?? "").trim();
  const treeAddress = (source.CNFT_TREE_ADDRESS ?? "").trim() || null;
  const provider = (source.CNFT_PROVIDER ?? "bubblegum").trim().toLowerCase() || "bubblegum";

  const reasons: string[] = [];
  if (!treasuryConfigured) reasons.push("falta CNFT_TREASURY_SECRET (wallet de tesoreria con SOL)");
  if (!treeAddress) reasons.push("falta CNFT_TREE_ADDRESS (merkle tree de Bubblegum creado)");
  if (provider !== "bubblegum") reasons.push("CNFT_PROVIDER distinto de bubblegum (sin implementacion)");

  let enabled = flagOn && walletKeyConfigured;
  if (network === "mainnet" && !mainnetUnlocked) {
    enabled = false;
    reasons.push("mainnet bloqueado por defecto: define CNFT_MAINNET_OK=1 para habilitarlo");
  }

  const mode: CnftMode = !enabled ? "off" : reasons.length === 0 ? "live" : "mock";

  return {
    network,
    enabled,
    mode,
    walletKeyConfigured,
    treasuryConfigured,
    treeConfigured: !!treeAddress,
    mainnetUnlocked,
    treeAddress,
    provider,
    reasons,
  };
}

export function explorerAddressUrl(address: string, network: CnftNetwork): string {
  const base = `https://explorer.solana.com/address/${address}`;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}

export function explorerTxUrl(signature: string, network: CnftNetwork): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}
