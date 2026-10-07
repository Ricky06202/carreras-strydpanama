import { and, eq, ne, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { schema } from "@/lib/db";
import { createYappyPayment } from "@/lib/yappy";

export const registrationSchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, "Teléfono inválido"),
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "Cédula: solo dígitos (6–15)"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  gender: z.enum(["masculino", "femenino", "otro"]),
  distanceId: z.string().min(1, "Selecciona una modalidad"),
  participantTypeKey: z.string().trim().optional(),
  teamName: z.string().trim().max(80).optional().or(z.literal("")),
  shirtSize: z.enum(["S", "M", "L", "XL", "XXL"]).optional(),
  code: z.string().trim().toUpperCase().optional().or(z.literal("")),
  termsAccepted: z.literal(true, { error: "Debes aceptar los términos" }),
  method: z.enum(["yappy", "transferencia", "efectivo", "code"]),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export class RegError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const nowIso = () => new Date().toISOString();

function ageFrom(birthDate: string): number {
  const b = new Date(birthDate + "T12:00:00");
  if (Number.isNaN(b.getTime())) throw new RegError(400, "birthDate inválida", { birthDate: "Fecha inválida" });
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  if (age < 3 || age > 100) throw new RegError(400, "Edad fuera de rango", { birthDate: "Revisa la fecha de nacimiento" });
  return age;
}

export function isPanamaMobile(v: string): boolean {
  return /^6\d{7}$/.test(v.replace(/\D/g, ""));
}

function matchCategory(
  categories: (typeof schema.raceCategories.$inferSelect)[],
  age: number,
  gender: string,
) {
  return (
    categories.find(
      (c) =>
        (c.gender === "ambos" || c.gender === gender) &&
        age >= c.minAge &&
        (c.maxAge > 90 || age <= c.maxAge),
    ) ?? null
  );
}

async function nextBib(db: Db, raceId: string, startingBib: number | null): Promise<number> {
  const base = startingBib && startingBib > 0 ? startingBib : 1;
  const row = await db
    .select({ maxBib: dsql<number>`max(${schema.registrations.bibNumber})` })
    .from(schema.registrations)
    .where(eq(schema.registrations.raceId, raceId))
    .get();
  const highest = row?.maxBib ?? null;
  return highest != null && highest >= base ? highest + 1 : base;
}

function genConfirmationCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "SPY";
  for (let i = 0; i < 9; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 6) out += "-";
  }
  return out;
}

export interface CreateResult {
  registrationId: string;
  confirmationCode: string;
  status: string;
  paymentStatus: string;
  amount: number;
  raceTitle: string;
  runnerName: string;
  category: string | null;
  pay?: { transactionId: string; token: string; documentName: string };
}

export async function createRegistration(db: Db, input: RegistrationInput): Promise<CreateResult> {
  const race = await db.select().from(schema.races).where(eq(schema.races.slug, input.slug)).get();
  if (!race) throw new RegError(404, "Carrera no encontrada");
  if (race.status !== "accepting") throw new RegError(409, "Esta carrera no está recibiendo inscripciones por ahora");

  const distance = await db
    .select()
    .from(schema.raceDistances)
    .where(and(eq(schema.raceDistances.id, input.distanceId), eq(schema.raceDistances.raceId, race.id)))
    .get();
  if (!distance) throw new RegError(400, "Modalidad inválida", { distanceId: "Selecciona una modalidad válida" });

  const age = ageFrom(input.birthDate);

  const categories = await db
    .select()
    .from(schema.raceCategories)
    .where(eq(schema.raceCategories.raceId, race.id))
    .all();
  const category = matchCategory(categories, age, input.gender);

  const dup = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(
      and(
        eq(schema.registrations.raceId, race.id),
        eq(schema.registrations.cedula, input.cedula),
        ne(schema.registrations.status, "anulado"),
      ),
    )
    .get();
  if (dup) throw new RegError(409, "Ya hay una inscripción con esta cédula en la carrera", { cedula: "Cédula ya inscrita" });

  if (race.maxParticipants != null) {
    const row = await db
      .select({ n: dsql<number>`count(*)` })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.raceId, race.id), ne(schema.registrations.status, "anulado")))
      .get();
    if ((row?.n ?? 0) >= race.maxParticipants) throw new RegError(409, "Cupos llenos");
  }

  let amount = distance.price ?? race.price;
  let codeRow: (typeof schema.registrationCodes.$inferSelect) | null = null;
  if (input.method === "yappy") {
    if (!isPanamaMobile(input.phone)) {
      throw new RegError(400, "Para Yappy necesitas un celular panameño (8 dígitos que empiezan con 6)", {
        phone: "Debe empezar con 6, 8 dígitos",
      });
    }
    amount = Math.round((amount + race.platformFee) * 100) / 100;
  }

  if (input.method === "code") {
    if (!input.code) throw new RegError(400, "Código requerido", { code: "Falta el código" });
    codeRow =
      (await db
        .select()
        .from(schema.registrationCodes)
        .where(and(eq(schema.registrationCodes.code, input.code), eq(schema.registrationCodes.raceId, race.id)))
        .get()) ?? null;
    if (!codeRow || codeRow.status === "redeemed") {
      throw new RegError(400, "Código inválido o ya usado", { code: "Código inválido o usado" });
    }
    if (codeRow.allowedType !== "all" && input.participantTypeKey && codeRow.allowedType !== input.participantTypeKey) {
      throw new RegError(400, "Este código no aplica para tu tipo de participante", { code: "No aplica al tipo seleccionado" });
    }
    amount = 0;
  }

  // confirmationCode unico
  let confirmationCode = genConfirmationCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select({ id: schema.registrations.id })
      .from(schema.registrations)
      .where(eq(schema.registrations.confirmationCode, confirmationCode))
      .get();
    if (!clash) break;
    confirmationCode = genConfirmationCode();
  }

  const isFreeCode = input.method === "code";
  const id = crypto.randomUUID();
  const ts = nowIso();

  await db
    .insert(schema.registrations)
    .values({
      id,
      raceId: race.id,
      confirmationCode,
      title: `${input.firstName} ${input.lastName}`,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      cedula: input.cedula,
      birthDate: input.birthDate,
      gender: input.gender,
      country: "Panamá",
      categoryId: category?.id ?? null,
      distanceId: distance.id,
      teamName: input.teamName || null,
      shirtSize: input.shirtSize ?? null,
      status: isFreeCode ? "inscrito" : "preinscrito",
      paymentStatus: isFreeCode ? "exento" : "pendiente",
      amountPaid: isFreeCode ? amount : 0,
      discountCode: codeRow?.code ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  await db
    .insert(schema.payments)
    .values({
      id: crypto.randomUUID(),
      registrationId: id,
      amount,
      currency: "USD",
      status: isFreeCode ? "approved" : "pending",
      provider: input.method === "yappy" ? "yappy" : input.method === "code" ? "code" : "manual",
      orderId: confirmationCode,
      payload: JSON.stringify({ input, createdAt: ts }),
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  let pay: CreateResult["pay"];
  if (input.method === "yappy") {
    try {
      pay = await createYappyPayment(confirmationCode, amount, input.phone.replace(/\D/g, ""));
    } catch (e) {
      await db.delete(schema.payments).where(eq(schema.payments.registrationId, id)).run();
      await db.delete(schema.registrations).where(eq(schema.registrations.id, id)).run();
      throw new RegError(502, `No se pudo iniciar el pago Yappy: ${String(e instanceof Error ? e.message : e).slice(0, 180)}`);
    }
  }

  if (isFreeCode && codeRow) {
    const bib = await nextBib(db, race.id, race.startingBib);
    await db
      .update(schema.registrations)
      .set({ bibNumber: bib, updatedAt: nowIso() })
      .where(eq(schema.registrations.id, id))
      .run();
    await db
      .update(schema.registrationCodes)
      .set({ status: "redeemed", redeemedByCedula: input.cedula, usedAt: nowIso(), updatedAt: nowIso() })
      .where(eq(schema.registrationCodes.id, codeRow.id))
      .run();
  }

  return {
    registrationId: id,
    confirmationCode,
    status: isFreeCode ? "inscrito" : "preinscrito",
    paymentStatus: isFreeCode ? "exento" : "pendiente",
    amount,
    raceTitle: race.title,
    runnerName: `${input.firstName} ${input.lastName}`,
    category: category?.title ?? null,
    pay,
  };
}

export interface ConfirmResult {
  ok: boolean;
  alreadyProcessed?: boolean;
  status?: string;
  bibNumber?: number | null;
  confirmationCode?: string;
}

// Idempotente: marca la inscripcion como inscrita/pagada al confirmarse Yappy.
export async function confirmRegistrationPayment(db: Db, orderIdRaw: string): Promise<ConfirmResult> {
  const orderId = orderIdRaw.trim().toUpperCase();
  let payment = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.orderId, orderId))
    .get();
  if (!payment) {
    // Yappy puede devolver el orderId sin guiones
    payment = await db
      .select()
      .from(schema.payments)
      .where(dsql`${schema.payments.orderId} = ${orderId.replace(/-/g, "")} or replace(${schema.payments.orderId}, '-', '') = ${orderId.replace(/-/g, "")}`)
      .get();
  }
  if (!payment) return { ok: false, status: "not-found" };
  if (payment.status === "approved") {
    const reg = await db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.id, payment.registrationId))
      .get();
    return { ok: true, alreadyProcessed: true, status: reg?.status, bibNumber: reg?.bibNumber, confirmationCode: reg?.confirmationCode };
  }

  const reg = await db
    .select()
    .from(schema.registrations)
    .where(eq(schema.registrations.id, payment.registrationId))
    .get();
  if (!reg) return { ok: false, status: "no-registration" };

  const race = await db.select().from(schema.races).where(eq(schema.races.id, reg.raceId)).get();
  const bib = await nextBib(db, reg.raceId, race?.startingBib ?? null);
  const ts = nowIso();
  await db
    .update(schema.registrations)
    .set({ status: "inscrito", paymentStatus: "pagado", amountPaid: payment.amount, bibNumber: bib, updatedAt: ts })
    .where(eq(schema.registrations.id, reg.id))
    .run();
  await db
    .update(schema.payments)
    .set({ status: "approved", updatedAt: ts })
    .where(eq(schema.payments.id, payment.id))
    .run();
  return { ok: true, status: "inscrito", bibNumber: bib, confirmationCode: reg.confirmationCode };
}

export async function getRegistrationStatus(db: Db, id: string) {
  const reg = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).get();
  if (!reg) return null;
  const race = await db.select({ title: schema.races.title }).from(schema.races).where(eq(schema.races.id, reg.raceId)).get();
  return {
    id: reg.id,
    confirmationCode: reg.confirmationCode,
    status: reg.status,
    paymentStatus: reg.paymentStatus,
    bibNumber: reg.bibNumber,
    amountPaid: reg.amountPaid,
    name: reg.title,
    raceTitle: race?.title ?? "",
  };
}
