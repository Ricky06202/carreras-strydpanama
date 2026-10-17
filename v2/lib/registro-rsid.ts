import { eq, isNull, sql as dsql } from "drizzle-orm";
import { schema, type Db } from "@/lib/db";
import { cedulaKey, formatCedula, phoneDigits } from "@/lib/cedula";

// Alta del corredor usando el PERFIL del RS ID.
//
// El RS ID no deja volver a ningun modulo con el perfil incompleto, asi que
// cuando el corredor es nuevo llega con: nombres, apellidos, cedula, telefono,
// pais y fecha de nacimiento ya verificados por el (y con su cuenta de RS ID).
// Por eso el alta NO pide nada: crea la cuenta y entra.
//
// Lo unico que puede pasar es que la cedula YA tenga cuenta con otro correo;
// ahi no se crea nada: se responde `vincular: true` y el corredor prueba que es
// suya con cedula + fecha de nacimiento (POST /api/auth/vincular).

export type PerfilRsId = {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  pais: string;
  nacimiento: string;
};

export type ResultadoAlta =
  | { ok: true; runnerId: string; nueva: boolean }
  | { ok: false; motivo: "vincular" | "perfil_incompleto" | "cedula_invalida"; cedula?: string };

/** Datos minimos para crear la cuenta de corredor (nombre/apellido/cedula/fecha). */
export function perfilUtilizable(p: PerfilRsId | null | undefined): boolean {
  if (!p) return false;
  const nombre = String(p.nombre || "").trim();
  const apellido = String(p.apellido || "").trim();
  return nombre.length >= 2 && apellido.length >= 2 && !!formatCedula(String(p.cedula || "")) && /^\d{4}-\d{2}-\d{2}$/.test(String(p.nacimiento || ""));
}

export async function crearRunnerDesdePerfil(db: Db, o: { email: string; perfil: PerfilRsId }): Promise<ResultadoAlta> {
  const email = o.email.trim().toLowerCase();
  const cedula = formatCedula(o.perfil.cedula);
  if (!cedula) return { ok: false, motivo: "cedula_invalida" };

  // Ya existe con ese correo (RS ID o correo de la inscripcion): solo se vincula.
  const ya = await db
    .select({ id: schema.runners.id })
    .from(schema.runners)
    .where(eq(schema.runners.email, email))
    .get();
  if (ya) {
    await db.update(schema.runners).set({ rsidEmail: email, updatedAt: new Date().toISOString() }).where(eq(schema.runners.id, ya.id)).run();
    return { ok: true, runnerId: ya.id, nueva: false };
  }

  // La cedula pertenece a otra cuenta: hay que probar propiedad, no duplicar.
  const porCedula = await db
    .select({ id: schema.runners.id })
    .from(schema.runners)
    .where(dsql`REPLACE(UPPER(${schema.runners.cedula}), '-', '') = ${cedulaKey(cedula)}`)
    .get();
  if (porCedula) return { ok: false, motivo: "vincular", cedula };

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.runners)
    .values({
      id,
      cedula,
      email,
      rsidEmail: email,
      firstName: o.perfil.nombre.trim().slice(0, 60),
      lastName: o.perfil.apellido.trim().slice(0, 60),
      phone: o.perfil.telefono ? phoneDigits(o.perfil.telefono) || null : null,
      birthDate: o.perfil.nacimiento,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  // Inscripciones hechas con ese correo antes de tener cuenta.
  await db
    .update(schema.registrations)
    .set({ runnerId: id, updatedAt: ts })
    .where(dsql`LOWER(${schema.registrations.email}) = ${email} AND ${isNull(schema.registrations.runnerId)}`)
    .run();

  return { ok: true, runnerId: id, nueva: true };
}
