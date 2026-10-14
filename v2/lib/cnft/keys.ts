// Llaves ed25519 (formato Solana) generadas con WebCrypto. Sin dependencias:
// - Direccion = base58 de la llave publica (32 bytes), igual que @solana/web3.js.
// - Secreto   = semilla ed25519 de 32 bytes en base64 (el "d" del JWK OKP).
// El secreto NUNCA se guarda en claro: lib/cnft/wallets.ts lo cifra con AES-GCM.
import { base58Decode, base58Encode } from "./base58";

export interface SolanaKeypair {
  /** Direccion base58 (lo que el atleta ve como "su wallet"). */
  publicKey: string;
  /** Semilla ed25519 (32 bytes) en base64. Material secreto. */
  secretB64: string;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToBytes(v: string): Uint8Array {
  const b64 = v.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (v.length % 4)) % 4);
  return b64ToBytes(b64);
}

function b64ToB64url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Genera una keypair ed25519 nueva (direccion Solana valida). */
export async function generateSolanaKeypair(): Promise<SolanaKeypair> {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as JsonWebKey;
  if (!jwk.d) throw new Error("WebCrypto no expuso la semilla ed25519");
  return { publicKey: base58Encode(raw), secretB64: bytesToB64(b64urlToBytes(jwk.d)) };
}

/** Reimporta la llave privada para firmar (uso futuro: mint real en la cadena). */
export async function importPrivateKey(secretB64: string, publicKeyB58: string): Promise<CryptoKey> {
  const jwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    d: b64ToB64url(secretB64),
    x: b64ToB64url(bytesToB64(base58Decode(publicKeyB58))),
    key_ops: ["sign"],
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["sign"]);
}

/** Formato Solana de 64 bytes (seed||pubkey): lo que espera Keypair.fromSecretKey. */
export function solanaSecretKeyBytes(secretB64: string, publicKeyB58: string): Uint8Array {
  const seed = b64ToBytes(secretB64);
  const pub = base58Decode(publicKeyB58);
  const out = new Uint8Array(64);
  out.set(seed.subarray(0, 32), 0);
  out.set(pub.subarray(0, 32), 32);
  return out;
}

export async function signMessage(
  message: Uint8Array,
  secretB64: string,
  publicKeyB58: string,
): Promise<Uint8Array> {
  const key = await importPrivateKey(secretB64, publicKeyB58);
  return new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, message as unknown as BufferSource));
}
