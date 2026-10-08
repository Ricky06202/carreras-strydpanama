import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";

/**
 * Rate limit de ventana fija persistido en D1 (tabla login_attempts).
 * Devuelve true si el caller ya excedió `limit` intentos en la ventana.
 */
export async function rateLimited(db: Db, key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const row = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key)).get();
  const fresh = !row || now - new Date(row.windowStart).getTime() > windowMs;
  if (fresh) {
    await db
      .insert(schema.loginAttempts)
      .values({ key, count: 1, windowStart: new Date(now).toISOString() })
      .onConflictDoUpdate({
        target: schema.loginAttempts.key,
        set: { count: 1, windowStart: new Date(now).toISOString() },
      })
      .run();
    return false;
  }
  if (row.count >= limit) return true;
  await db
    .update(schema.loginAttempts)
    .set({ count: row.count + 1 })
    .where(eq(schema.loginAttempts.key, key))
    .run();
  return false;
}

/** IP real del cliente detrás de Cloudflare; fallback razonable en dev. */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "desconocida";
}
