import { and, asc, eq, inArray, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type Db } from "@/lib/db";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS, type AdminExpense, type FinanceStats } from "@/lib/admin/finance-constants";

export { EXPENSE_CATEGORIES, EXPENSE_METHODS };
export type { AdminExpense, FinanceStats };

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "La referencia es obligatoria").max(160),
  beneficiary: z.string().trim().max(160).optional().default(""),
  amount: z.coerce.number().finite().nonnegative("El monto no puede ser negativo"),
  payDate: z.string().trim().min(1, "La fecha es obligatoria"),
  category: z.string().trim().max(80).optional().default(""),
  method: z.enum(EXPENSE_METHODS).optional().default("Yappy"),
  reference: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export async function listExpenses(raceId: string): Promise<AdminExpense[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.raceId, raceId))
    .orderBy(asc(schema.expenses.payDate), asc(schema.expenses.amount))
    .limit(5000)
    .all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    beneficiary: r.beneficiary ?? "",
    amount: Number(r.amount) || 0,
    payDate: r.payDate,
    category: r.category ?? "",
    method: r.method,
    reference: r.reference ?? "",
    notes: r.notes ?? "",
    createdAt: r.createdAt,
  }));
}

export async function createExpense(raceId: string, input: ExpenseInput): Promise<AdminExpense> {
  const db = getDb();
  const race = await db.select({ id: schema.races.id }).from(schema.races).where(eq(schema.races.id, raceId)).get();
  if (!race) throw new Error("Carrera no encontrada");
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.expenses)
    .values({
      id,
      raceId,
      title: input.title,
      beneficiary: input.beneficiary || null,
      amount: input.amount,
      payDate: input.payDate.slice(0, 10),
      category: input.category || null,
      method: input.method ?? "Yappy",
      reference: input.reference || null,
      notes: input.notes || null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return (await listExpenses(raceId)).find((e) => e.id === id)!;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  const db = getDb();
  const row = await db.select({ id: schema.expenses.id }).from(schema.expenses).where(eq(schema.expenses.id, id)).get();
  if (!row) throw new Error("Pago saliente no encontrado");
  await db
    .update(schema.expenses)
    .set({
      title: input.title,
      beneficiary: input.beneficiary || null,
      amount: input.amount,
      payDate: input.payDate.slice(0, 10),
      category: input.category || null,
      method: input.method ?? "Yappy",
      reference: input.reference || null,
      notes: input.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.expenses.id, id))
    .run();
}

export async function deleteExpense(id: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run();
}

/**
 * Igual que v1: recaudación real = suma de amount_paid de inscritos confirmados
 * (pago "pagado"/"exento" o estado "inscrito"); pendientes = preinscritos sin pagar.
 */
export async function financeStats(db: Db, raceId: string): Promise<FinanceStats> {
  const rows = await db
    .select({
      status: schema.registrations.status,
      paymentStatus: schema.registrations.paymentStatus,
      amountPaid: schema.registrations.amountPaid,
    })
    .from(schema.registrations)
    .where(and(eq(schema.registrations.raceId, raceId), dsql`${schema.registrations.status} <> 'anulado'`))
    .all();

  let recaudado = 0;
  let confirmados = 0;
  let pendientes = 0;
  for (const r of rows) {
    const pagado = r.paymentStatus === "pagado" || r.paymentStatus === "exento";
    const confirmado = r.status === "inscrito" || pagado;
    if (!confirmado) {
      pendientes++;
      continue;
    }
    confirmados++;
    if (r.paymentStatus === "pagado") recaudado += Number(r.amountPaid) || 0;
  }

  const exp = await db
    .select({ total: dsql<number>`coalesce(sum(${schema.expenses.amount}), 0)` })
    .from(schema.expenses)
    .where(eq(schema.expenses.raceId, raceId))
    .get();
  const salientes = Number(exp?.total) || 0;
  return { recaudado, salientes, saldo: recaudado - salientes, confirmados, pendientes };
}

/** Helper no usado salvo para futuras listas de varias carreras. */
export async function sumExpensesByRace(raceIds: string[]): Promise<Map<string, number>> {
  if (raceIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({ raceId: schema.expenses.raceId, total: dsql<number>`coalesce(sum(${schema.expenses.amount}), 0)` })
    .from(schema.expenses)
    .where(inArray(schema.expenses.raceId, raceIds))
    .groupBy(schema.expenses.raceId)
    .all();
  return new Map(rows.map((r) => [r.raceId, Number(r.total) || 0]));
}
