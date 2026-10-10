import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin/api";
import { getDb } from "@/lib/db";
import { createExpense, expenseSchema, financeStats, listExpenses } from "@/lib/admin/finance";

export async function GET(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const raceId = new URL(req.url).searchParams.get("raceId") ?? "";
  if (!raceId) return NextResponse.json({ error: "Falta raceId" }, { status: 400 });
  const [expenses, stats] = await Promise.all([listExpenses(raceId), financeStats(getDb(), raceId)]);
  return NextResponse.json({ expenses, stats }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const raceId = typeof body?.raceId === "string" ? body.raceId : "";
  if (!raceId) return NextResponse.json({ error: "Falta raceId" }, { status: 400 });

  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first ? first.message : "Datos inválidos" }, { status: 422 });
  }
  try {
    const expense = await createExpense(raceId, parsed.data);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg.includes("no encontrada") ? 404 : 500 });
  }
}
