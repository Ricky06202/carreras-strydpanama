import { and, asc, count, eq, like, or, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type Db } from "@/lib/db";
import { cedulaKey } from "@/lib/cedula";
import { confirmRegistrationPayment } from "@/lib/registration/service";

export type AdminRegItem = {
  id: string;
  title: string;
  email: string;
  phone: string | null;
  cedula: string | null;
  birthDate: string | null;
  gender: string | null;
  shirtSize: string | null;
  teamName: string | null;
  confirmationCode: string;
  bibNumber: number | null;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  discountCode: string | null;
  createdAt: string;
  updatedAt: string;
  distanceTitle: string | null;
  categoryTitle: string | null;
};

export type AdminRegStats = {
  inscritos: number;
  preinscritos: number;
  pendientes: number;
  anulados: number;
  recaudacion: number;
};

const PER_PAGE = 30;

export async function adminStats(db: Db, raceId: string): Promise<AdminRegStats> {
  const rows = await db
    .select({
      status: schema.registrations.status,
      paymentStatus: schema.registrations.paymentStatus,
      n: count(),
      total: dsql<number>`coalesce(sum(${schema.registrations.amountPaid}), 0)`,
    })
    .from(schema.registrations)
    .where(eq(schema.registrations.raceId, raceId))
    .groupBy(schema.registrations.status, schema.registrations.paymentStatus);

  const s: AdminRegStats = { inscritos: 0, preinscritos: 0, pendientes: 0, anulados: 0, recaudacion: 0 };
  for (const r of rows) {
    if (r.status === "inscrito") s.inscritos += r.n;
    if (r.status === "preinscrito") s.preinscritos += r.n;
    if (r.status === "anulado") s.anulados += r.n;
    if (r.status !== "anulado" && r.paymentStatus === "pendiente") s.pendientes += r.n;
    s.recaudacion += Number(r.total ?? 0);
  }
  return s;
}

export async function adminListRegs(opts: {
  raceId: string;
  q?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
}): Promise<{ items: AdminRegItem[]; total: number; page: number; perPage: number }> {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const conds = [eq(schema.registrations.raceId, opts.raceId)];
  if (opts.status && ["preinscrito", "inscrito", "anulado"].includes(opts.status)) {
    conds.push(eq(schema.registrations.status, opts.status as "preinscrito" | "inscrito" | "anulado"));
  }
  if (opts.paymentStatus && ["pendiente", "pagado", "reembolsado", "exento"].includes(opts.paymentStatus)) {
    conds.push(eq(schema.registrations.paymentStatus, opts.paymentStatus as "pendiente" | "pagado" | "reembolsado" | "exento"));
  }

  const q = (opts.q ?? "").trim();
  if (q) {
    const likeQ = `%${q.replace(/[%_]/g, "")}%`;
    const text = [
      like(schema.registrations.title, likeQ),
      like(schema.registrations.email, likeQ),
      like(schema.registrations.cedula, likeQ),
      like(schema.registrations.confirmationCode, likeQ),
    ];
    const key = cedulaKey(q);
    if (key.length >= 6) text.push(dsql`REPLACE(UPPER(${schema.registrations.cedula}), '-', '') = ${key}`);
    if (/^\d+$/.test(q)) text.push(eq(schema.registrations.bibNumber, Number(q)));
    conds.push(or(...text)!);
  }

  const where = and(...conds);
  const selectShape = {
    id: schema.registrations.id,
    title: schema.registrations.title,
    email: schema.registrations.email,
    phone: schema.registrations.phone,
    cedula: schema.registrations.cedula,
    birthDate: schema.registrations.birthDate,
    gender: schema.registrations.gender,
    shirtSize: schema.registrations.shirtSize,
    teamName: schema.registrations.teamName,
    confirmationCode: schema.registrations.confirmationCode,
    bibNumber: schema.registrations.bibNumber,
    status: schema.registrations.status,
    paymentStatus: schema.registrations.paymentStatus,
    amountPaid: schema.registrations.amountPaid,
    discountCode: schema.registrations.discountCode,
    createdAt: schema.registrations.createdAt,
    updatedAt: schema.registrations.updatedAt,
    distanceTitle: schema.raceDistances.title,
    categoryTitle: schema.raceCategories.title,
  } as const;

  const [items, totalRow] = await Promise.all([
    db
      .select(selectShape)
      .from(schema.registrations)
      .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
      .leftJoin(schema.raceCategories, eq(schema.registrations.categoryId, schema.raceCategories.id))
      .where(where)
      .orderBy(asc(schema.registrations.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE)
      .all(),
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(where)
      .get(),
  ]);

  return { items, total: totalRow?.n ?? 0, page, perPage: PER_PAGE };
}

const editSchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 0 || (v.length >= 7 && v.length <= 10), "Teléfono inválido")
    .optional(),
  shirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
  teamName: z.string().trim().max(80).optional(),
  bibNumber: z.coerce.number().int().min(1).max(99999).optional(),
});

export class AdminRegError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getRegOr404(db: Db, id: string) {
  const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).get();
  if (!reg) throw new AdminRegError(404, "Inscripción no encontrada");
  return reg;
}

/** Acciones del admin sobre una inscripción. Devuelve mensaje para el toast. */
export async function adminRegAction(
  id: string,
  action: "confirm" | "anular" | "restaurar" | "reembolsar" | "editar",
  payload?: unknown,
): Promise<{ message: string; reg?: { status: string; paymentStatus: string; bibNumber: number | null } }> {
  const db = getDb();
  const reg = await getRegOr404(db, id);
  const ts = new Date().toISOString();

  if (action === "confirm") {
    if (reg.status === "anulado") throw new AdminRegError(409, "Está anulada; restáurala primero");
    const res = await confirmRegistrationPayment(db, reg.confirmationCode);
    if (!res.ok) throw new AdminRegError(409, "No hay pago pendiente para confirmar");
    return {
      message: res.alreadyProcessed
        ? `Ya estaba confirmada (dorsal ${res.bibNumber ?? "—"})`
        : `Pago confirmado — dorsal #${res.bibNumber ?? "—"} y correo enviado`,
      reg: { status: "inscrito", paymentStatus: "pagado", bibNumber: res.bibNumber ?? reg.bibNumber },
    };
  }

  if (action === "anular") {
    if (reg.status === "anulado") throw new AdminRegError(409, "Ya está anulada");
    await db
      .update(schema.registrations)
      .set({ status: "anulado", updatedAt: ts })
      .where(eq(schema.registrations.id, id))
      .run();
    return { message: `${reg.title} fue anulado`, reg: { status: "anulado", paymentStatus: reg.paymentStatus, bibNumber: reg.bibNumber } };
  }

  if (action === "restaurar") {
    if (reg.status !== "anulado") throw new AdminRegError(409, "No está anulada");
    const back = reg.paymentStatus === "pagado" || reg.paymentStatus === "exento" ? "inscrito" : "preinscrito";
    await db.update(schema.registrations).set({ status: back, updatedAt: ts }).where(eq(schema.registrations.id, id)).run();
    return { message: `Inscripción restaurada como ${back}`, reg: { status: back, paymentStatus: reg.paymentStatus, bibNumber: reg.bibNumber } };
  }

  if (action === "reembolsar") {
    if (reg.paymentStatus !== "pagado") throw new AdminRegError(409, "Solo se reembolsan pagos pagados");
    await db.update(schema.registrations).set({ paymentStatus: "reembolsado", updatedAt: ts }).where(eq(schema.registrations.id, id)).run();
    await db.update(schema.payments).set({ status: "refunded", updatedAt: ts }).where(eq(schema.payments.registrationId, id)).run();
    return { message: "Pago marcado como reembolsado", reg: { status: reg.status, paymentStatus: "reembolsado", bibNumber: reg.bibNumber } };
  }

  // editar
  const parsed = editSchema.safeParse(payload ?? {});
  if (!parsed.success) throw new AdminRegError(422, parsed.error.issues[0]?.message ?? "Datos inválidos");
  const patch: Record<string, unknown> = { updatedAt: ts };
  if (parsed.data.email) patch.email = parsed.data.email;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone || null;
  if (parsed.data.shirtSize) patch.shirtSize = parsed.data.shirtSize;
  if (parsed.data.teamName !== undefined) patch.teamName = parsed.data.teamName || null;
  if (parsed.data.bibNumber !== undefined && parsed.data.bibNumber !== null) {
    const clash = await db
      .select({ id: schema.registrations.id })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.raceId, reg.raceId), eq(schema.registrations.bibNumber, parsed.data.bibNumber)))
      .get();
    if (clash && clash.id !== id) throw new AdminRegError(409, `El dorsal ${parsed.data.bibNumber} ya está tomado en esta carrera`);
    patch.bibNumber = parsed.data.bibNumber;
  }
  if (Object.keys(patch).length === 1) throw new AdminRegError(422, "Nada que actualizar");
  await db.update(schema.registrations).set(patch as never).where(eq(schema.registrations.id, id)).run();
  const fresh = await getRegOr404(db, id);
  return {
    message: "Inscripción actualizada",
    reg: { status: fresh.status, paymentStatus: fresh.paymentStatus, bibNumber: fresh.bibNumber },
  };
}
