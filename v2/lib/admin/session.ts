import { cookies } from "next/headers";
import { env } from "cloudflare:workers";

const COOKIE = "stryd2_admin";
const HOURS = 12;

async function hmac(secret: string, msg: string): Promise<string> {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", km, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Timing-safe compare de la contraseña maestra de admin. */
export async function checkAdminPassword(password: string): Promise<boolean> {
  const expected = env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const a = await hmac(env.ADMIN_SECRET || "dev-secret", password);
  const b = await hmac(env.ADMIN_SECRET || "dev-secret", expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function startAdminSession(secure: boolean): Promise<void> {
  const token = await hmac(env.ADMIN_SECRET || "dev-secret", `admin-${new Date().toISOString().slice(0, 10)}`);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/admin",
    maxAge: HOURS * 3600,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const secret = env.ADMIN_SECRET || "dev-secret";
  const got = (await cookies()).get(COOKIE)?.value;
  if (!got) return false;
  for (const d of [0, -1]) {
    const day = new Date(Date.now() + d * 3600_000 * 24).toISOString().slice(0, 10);
    if (got === (await hmac(secret, `admin-${day}`))) return true;
  }
  return false;
}
