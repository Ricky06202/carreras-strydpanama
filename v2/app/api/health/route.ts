import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { count } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const [races, registrations] = await Promise.all([
    db.select({ n: count() }).from(schema.races),
    db.select({ n: count() }).from(schema.registrations),
  ]);
  return NextResponse.json({
    ok: true,
    races: races[0]?.n ?? 0,
    registrations: registrations[0]?.n ?? 0,
  });
}
