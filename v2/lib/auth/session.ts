import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const COOKIE = "stryd2_session";
const DAYS = 30;

type BS = BufferSource;
const asBS = (u: Uint8Array) => u as unknown as BS;

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array((hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: asBS(salt), iterations: 100_000, hash: "SHA-256" }, km, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: asBS(hexToBytes(salt)), iterations: 100_000, hash: "SHA-256" }, km, 256);
  return timingSafeEqStr(bytesToHex(new Uint8Array(bits)), hash);
}

export function generateSessionToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function timingSafeEqStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const isoExpiry = () => new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000).toISOString();

export async function startSession(runnerId: string, secure: boolean): Promise<void> {
  const token = generateSessionToken();
  const db = getDb();
  await db
    .update(schema.runners)
    .set({ sessionToken: token, sessionExpiry: isoExpiry(), updatedAt: new Date().toISOString() })
    .where(eq(schema.runners.id, runnerId))
    .run();
  const jar = await cookies();
  jar.set(COOKIE, `${runnerId}:${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    const [runnerId] = raw.split(":");
    if (runnerId) {
      const db = getDb();
      await db
        .update(schema.runners)
        .set({ sessionToken: null, sessionExpiry: null, updatedAt: new Date().toISOString() })
        .where(eq(schema.runners.id, runnerId))
        .run();
    }
  }
  jar.delete(COOKIE);
}

export type RunnerSession = typeof schema.runners.$inferSelect;

export async function getRunner(): Promise<RunnerSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [runnerId, token] = decodeURIComponent(raw).split(":");
  if (!runnerId || !token) return null;
  const db = getDb();
  const runner = await db.select().from(schema.runners).where(eq(schema.runners.id, runnerId)).get();
  if (!runner || !runner.sessionToken || !timingSafeEqStr(runner.sessionToken, token)) return null;
  if (!runner.sessionExpiry || new Date(runner.sessionExpiry).getTime() < Date.now()) return null;
  return runner;
}
