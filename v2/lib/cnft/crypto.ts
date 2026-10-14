// Cifrado en reposo de la llave del atleta: AES-GCM 256 (WebCrypto).
// La clave maestra vive como secreto del worker (CNFT_WALLET_KEY), nunca en la DB.
import { b64ToBytes, bytesToB64 } from "./keys";

const enc = new TextEncoder();
const dec = new TextDecoder();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Deriva la clave AES a partir de CNFT_WALLET_KEY (hex/base64 de 32 bytes, o passphrase -> SHA-256). */
export async function walletCryptoKey(raw: string): Promise<CryptoKey> {
  const value = (raw ?? "").trim();
  if (!value) throw new Error("falta CNFT_WALLET_KEY");
  let bytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(value)) bytes = hexToBytes(value);
  else {
    try {
      bytes = b64ToBytes(value);
    } catch {
      bytes = enc.encode(value);
    }
  }
  if (bytes.length !== 32) bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)));
  return crypto.subtle.importKey("raw", bytes as unknown as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(
  plain: string,
  key: CryptoKey,
): Promise<{ cipherB64: string; ivB64: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plain),
  );
  return { cipherB64: bytesToB64(new Uint8Array(cipher)), ivB64: bytesToB64(iv) };
}

export async function decryptSecret(
  cipherB64: string,
  ivB64: string,
  key: CryptoKey,
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) as unknown as BufferSource },
    key,
    b64ToBytes(cipherB64) as unknown as BufferSource,
  );
  return dec.decode(plain);
}
