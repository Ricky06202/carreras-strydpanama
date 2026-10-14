// Wallet gestionada del atleta: una keypair ed25519 por dueno, cifrada en D1.
// El atleta no necesita entender cripto: recibe una direccion y ya.
// Path futuro "conectar mi Phantom": guardar la direccion con managed=false y
// sin secreto (la columna secretCipher queda NULL).
import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";
import { generateSolanaKeypair } from "./keys";
import { decryptSecret, encryptSecret, walletCryptoKey } from "./crypto";
import type { CnftNetwork } from "./config";

export interface ManagedWallet {
  id: string;
  publicKey: string;
  network: CnftNetwork;
  managed: boolean;
  created: boolean;
}

const nowIso = () => new Date().toISOString();

export async function findWallet(
  db: Db,
  ownerType: "runner" | "registration",
  ownerId: string,
  network: CnftNetwork,
) {
  return (
    (await db
      .select()
      .from(schema.athleteWallets)
      .where(
        and(
          eq(schema.athleteWallets.ownerType, ownerType),
          eq(schema.athleteWallets.ownerId, ownerId),
          eq(schema.athleteWallets.network, network),
        ),
      )
      .get()) ?? null
  );
}

/** Devuelve (o crea) la wallet gestionada del dueno. Idempotente. */
export async function ensureManagedWallet(
  db: Db,
  opts: {
    ownerType: "runner" | "registration";
    ownerId: string;
    network: CnftNetwork;
    walletKey: string;
  },
): Promise<ManagedWallet> {
  const existing = await findWallet(db, opts.ownerType, opts.ownerId, opts.network);
  if (existing) {
    return {
      id: existing.id,
      publicKey: existing.publicKey,
      network: opts.network,
      managed: existing.managed,
      created: false,
    };
  }

  const keypair = await generateSolanaKeypair();
  const key = await walletCryptoKey(opts.walletKey);
  const { cipherB64, ivB64 } = await encryptSecret(keypair.secretB64, key);
  const id = crypto.randomUUID();
  const ts = nowIso();
  try {
    await db
      .insert(schema.athleteWallets)
      .values({
        id,
        ownerType: opts.ownerType,
        ownerId: opts.ownerId,
        network: opts.network,
        publicKey: keypair.publicKey,
        secretCipher: cipherB64,
        secretIv: ivB64,
        keyVersion: 1,
        managed: true,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
  } catch {
    // Carrera con otra emision simultanea: la fila ya existe -> usarla.
    const again = await findWallet(db, opts.ownerType, opts.ownerId, opts.network);
    if (again) {
      return {
        id: again.id,
        publicKey: again.publicKey,
        network: opts.network,
        managed: again.managed,
        created: false,
      };
    }
    throw new Error("no se pudo crear la wallet del atleta");
  }

  return { id, publicKey: keypair.publicKey, network: opts.network, managed: true, created: true };
}

/**
 * Registra una wallet EXTERNA (Phantom) para el atleta: sin secreto en el server.
 * Deja la puerta abierta al path "conectar mi Phantom" sin tocar el resto.
 */
export async function registerExternalWallet(
  db: Db,
  opts: { ownerType: "runner" | "registration"; ownerId: string; network: CnftNetwork; publicKey: string },
): Promise<ManagedWallet> {
  const existing = await findWallet(db, opts.ownerType, opts.ownerId, opts.network);
  if (existing) {
    await db
      .update(schema.athleteWallets)
      .set({ publicKey: opts.publicKey, managed: false, secretCipher: null, secretIv: null, updatedAt: nowIso() })
      .where(eq(schema.athleteWallets.id, existing.id))
      .run();
    return { id: existing.id, publicKey: opts.publicKey, network: opts.network, managed: false, created: false };
  }
  const id = crypto.randomUUID();
  const ts = nowIso();
  await db
    .insert(schema.athleteWallets)
    .values({
      id,
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      network: opts.network,
      publicKey: opts.publicKey,
      secretCipher: null,
      secretIv: null,
      keyVersion: 1,
      managed: false,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return { id, publicKey: opts.publicKey, network: opts.network, managed: false, created: true };
}

/** Descifra el secreto (SOLO lo usa el camino de mint real; nunca se expone). */
export async function exportWalletSecret(
  db: Db,
  walletId: string,
  walletKey: string,
): Promise<{ publicKey: string; secretB64: string } | null> {
  const row = await db
    .select()
    .from(schema.athleteWallets)
    .where(eq(schema.athleteWallets.id, walletId))
    .get();
  if (!row || !row.secretCipher || !row.secretIv) return null;
  const key = await walletCryptoKey(walletKey);
  return { publicKey: row.publicKey, secretB64: await decryptSecret(row.secretCipher, row.secretIv, key) };
}
