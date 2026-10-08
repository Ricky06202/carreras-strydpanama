import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const COOKIE = "stryd2_admin";
const HOURS = 12;

function isDevRuntime(): boolean {
  return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "development");
}

/** Fail-closed: en producción, sin ADMIN_SECRET real no existe login posible. */
function adminSecret(): string | null {
  const s = env.ADMIN_SECRET as string | undefined;
  if (s && s.length >= 16) return s;
  if (isDevRuntime()) return "dev-secret-local";
  return null;
}

async function hmac(secret: string, msg: string): Promise<string> {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", km, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(v: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Timing-safe compare de la contraseña maestra de admin. */
export async function checkAdminPassword(password: string): Promise<boolean> {
  const secret = adminSecret();
  const expected = env.ADMIN_PASSWORD as string | undefined;
  if (!secret || !expected || !password) return false;
  const a = await hmac(secret, password);
  const b = await hmac(secret, expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Sesión = token aleatorio (CSPRNG) por login, guardado como SHA-256 en D1:
// revocable en logout, no derivable del día ni del secreto, y la cookie viaja en
// path "/" para cubrir también /api/admin/* (antes path="/admin" rompía el guard).
export async function startAdminSession(secure: boolean): Promise<void> {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  await getDb()
    .insert(schema.adminSessions)
    .values({ tokenHash, expiresAt: new Date(Date.now() + HOURS * 3600_000).toISOString() })
    .run();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: HOURS * 3600,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      await getDb().delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, await sha256Hex(token))).run();
    } catch {
      /* tabla ausente en dev viejo: la cookie igual se limpia */
    }
  }
  // Sobrescribir en ambos paths: el "/" actual y el "/admin" heredado de sesiones viejas.
  jar.set(COOKIE, "", { path: "/", maxAge: 0 });
  jar.set(COOKIE, "", { path: "/admin", maxAge: 0 });
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const db = getDb();
  const hash = await sha256Hex(token);
  let row: { expiresAt: string } | undefined;
  try {
    row = await db.select().from(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, hash)).get();
  } catch {
    return false; // tabla aún no migrada → fail-closed
  }
  if (!row) return false;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, hash)).run().catch(() => {});
    return false;
  }
  return true;
}
