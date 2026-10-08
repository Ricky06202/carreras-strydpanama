import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const COOKIE = "stryd2_admin";
const HOURS = 12;

async function sha256Hex(v: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Sesión = token aleatorio (CSPRNG) por login, guardado como SHA-256 en D1:
// revocable en logout, no derivable del día ni del secreto, y la cookie viaja en
// path "/" para cubrir también /api/admin/* (antes path="/admin" rompía el guard).
// OJO vinext: mutar cookies() dentro de un route handler NO emite Set-Cookie;
// las cookies de sesión SIEMPRE se adjuntan a la respuesta (res.cookies).
export async function startAdminSession(res: NextResponse, secure: boolean): Promise<void> {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  await getDb()
    .insert(schema.adminSessions)
    .values({ tokenHash, expiresAt: new Date(Date.now() + HOURS * 3600_000).toISOString() })
    .run();
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: HOURS * 3600,
  });
}

export async function clearAdminSession(res: NextResponse, secure: boolean): Promise<void> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    try {
      await getDb().delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, await sha256Hex(token))).run();
    } catch {
      /* tabla ausente en dev viejo: la cookie igual se limpia */
    }
  }
  // Sobrescribir en ambos paths: el "/" actual y el "/admin" heredado de sesiones viejas.
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
  res.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/admin", maxAge: 0 });
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
