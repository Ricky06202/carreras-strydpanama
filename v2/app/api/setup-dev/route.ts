import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { LOCAL_DB_STATEMENTS } from "@/lib/dev/local-db-sql";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "solo dev" }, { status: 403 });
  }
  if (LOCAL_DB_STATEMENTS.length === 0) {
    return NextResponse.json(
      { error: "seed vacío — corre: bun scripts/migrate.ts && bun scripts/make-local-db-sql.ts" },
      { status: 501 },
    );
  }
  const failed: string[] = [];
  for (const q of LOCAL_DB_STATEMENTS) {
    try {
      await env.DB.prepare(q).run();
    } catch (e) {
      failed.push(`${q.slice(0, 50)}: ${String((e as Error).message).slice(0, 80)}`);
    }
  }
  const races = await env.DB.prepare("SELECT COUNT(*) AS n FROM races").first();
  return NextResponse.json({ ok: failed.length === 0, statements: LOCAL_DB_STATEMENTS.length, failed, races });
}
