import { and, asc, count, eq, isNotNull, isNull, like, ne, or, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type Db } from "@/lib/db";

export type AdminTeamItem = {
  id: string;
  name: string;
  isApproved: boolean;
  createdAt: string;
  members: number;
};

export type AdminTeamStats = {
  total: number;
  approved: number;
  pending: number;
  linkedRegs: number;
  orphanNames: number;
};

export type OrphanTeamName = { name: string; members: number };

const PER_PAGE = 30;

export class AdminTeamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const teamNameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres");

/** Miembros vivos: por vínculo explícito (team_id) o por coincidencia de nombre (el wizard solo guarda teamName). */
const membersCountSql =
  dsql<number>`(select count(*) from ${schema.registrations} where ${schema.registrations.status} <> 'anulado' and (${schema.registrations.teamId} = ${schema.teams.id} or lower(${schema.registrations.teamName}) = lower(${schema.teams.name})))`;

async function ensureUniqueName(db: Db, name: string, exceptId?: string): Promise<void> {
  const conds = [dsql`lower(${schema.teams.name}) = lower(${name})`];
  if (exceptId) conds.push(ne(schema.teams.id, exceptId));
  const clash = await db.select({ id: schema.teams.id }).from(schema.teams).where(and(...conds)).get();
  if (clash) throw new AdminTeamError(409, "Ya existe un equipo con ese nombre");
}

async function getTeamOr404(db: Db, id: string) {
  const team = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).get();
  if (!team) throw new AdminTeamError(404, "Equipo no encontrado");
  return team;
}

export async function adminListTeams(opts: {
  q?: string;
  status?: string;
  page?: number;
}): Promise<{
  items: AdminTeamItem[];
  total: number;
  page: number;
  perPage: number;
  stats: AdminTeamStats;
  orphans: OrphanTeamName[];
}> {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const conds = [];
  if (opts.status === "approved") conds.push(eq(schema.teams.isApproved, true));
  if (opts.status === "pending") conds.push(eq(schema.teams.isApproved, false));
  const q = (opts.q ?? "").trim();
  if (q) conds.push(like(schema.teams.name, `%${q.replace(/[%_]/g, "")}%`));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow, statsRow, orphanRows, linkedRow] = await Promise.all([
    db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        isApproved: schema.teams.isApproved,
        createdAt: schema.teams.createdAt,
        members: membersCountSql,
      })
      .from(schema.teams)
      .where(where)
      .orderBy(asc(schema.teams.name))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE)
      .all(),
    db.select({ n: count() }).from(schema.teams).where(where).get(),
    db
      .select({
        total: count(),
        approved: dsql<number>`sum(case when ${schema.teams.isApproved} then 1 else 0 end)`,
      })
      .from(schema.teams)
      .get(),
    // Nombres usados en inscripciones activas que no corresponden a ningún equipo registrado.
    db
      .select({ name: schema.registrations.teamName, members: count() })
      .from(schema.registrations)
      .where(
        and(
          ne(schema.registrations.status, "anulado"),
          isNotNull(schema.registrations.teamName),
          dsql`trim(${schema.registrations.teamName}) <> ''`,
          isNull(schema.registrations.teamId),
          dsql`not exists (select 1 from ${schema.teams} where lower(${schema.teams.name}) = lower(${schema.registrations.teamName}))`,
        ),
      )
      .groupBy(schema.registrations.teamName)
      .orderBy(dsql`count(*) desc`)
      .limit(30)
      .all(),
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(
        and(
          ne(schema.registrations.status, "anulado"),
          dsql`(${schema.registrations.teamId} is not null or (${schema.registrations.teamName} is not null and exists (select 1 from ${schema.teams} where lower(${schema.teams.name}) = lower(${schema.registrations.teamName}))))`,
        ),
      )
      .get(),
  ]);

  const total = statsRow?.total ?? 0;
  const approved = Number(statsRow?.approved ?? 0);
  return {
    items: rows.map((r) => ({ ...r, members: Number(r.members ?? 0) })),
    total: totalRow?.n ?? 0,
    page,
    perPage: PER_PAGE,
    stats: {
      total,
      approved,
      pending: total - approved,
      linkedRegs: linkedRow?.n ?? 0,
      orphanNames: orphanRows.length,
    },
    orphans: orphanRows
      .filter((r): r is OrphanTeamName => !!r.name)
      .map((r) => ({ name: r.name, members: r.members })),
  };
}

/** Crear equipo; opcionalmente aprobarlo y vincular inscripciones activas que ya usen ese nombre. */
export async function createTeam(raw: { name: string; approve?: boolean }): Promise<{ message: string }> {
  const parsed = teamNameSchema.safeParse(raw.name);
  if (!parsed.success) throw new AdminTeamError(422, parsed.error.issues[0]?.message ?? "Nombre inválido");
  const db = getDb();
  const name = parsed.data;
  await ensureUniqueName(db, name);

  const ts = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(schema.teams).values({ id, name, isApproved: !!raw.approve, createdAt: ts, updatedAt: ts }).run();

  const linkCond = and(
    ne(schema.registrations.status, "anulado"),
    isNull(schema.registrations.teamId),
    isNotNull(schema.registrations.teamName),
    dsql`lower(${schema.registrations.teamName}) = lower(${name})`,
  );
  const match = await db.select({ n: count() }).from(schema.registrations).where(linkCond).get();
  const matched = match?.n ?? 0;
  if (matched > 0) {
    await db.update(schema.registrations).set({ teamId: id, updatedAt: ts }).where(linkCond).run();
  }

  return {
    message: `Equipo "${name}" creado${raw.approve ? " y aprobado" : ""}${matched > 0 ? ` — ${matched} inscripción(es) vinculadas` : ""}`,
  };
}

/** Acciones del admin sobre un equipo. Devuelve mensaje para el toast. */
export async function adminTeamAction(
  id: string,
  action: "approve" | "unapprove" | "rename" | "delete",
  payload?: unknown,
): Promise<{ message: string }> {
  const db = getDb();
  const team = await getTeamOr404(db, id);
  const ts = new Date().toISOString();

  if (action === "approve") {
    if (team.isApproved) throw new AdminTeamError(409, "Ya está aprobado");
    await db.update(schema.teams).set({ isApproved: true, updatedAt: ts }).where(eq(schema.teams.id, id)).run();
    return { message: `Equipo "${team.name}" aprobado ✓` };
  }

  if (action === "unapprove") {
    if (!team.isApproved) throw new AdminTeamError(409, "No estaba aprobado");
    await db.update(schema.teams).set({ isApproved: false, updatedAt: ts }).where(eq(schema.teams.id, id)).run();
    return { message: `Aprobación retirada de "${team.name}"` };
  }

  if (action === "rename") {
    const parsed = teamNameSchema.safeParse((payload as { name?: unknown })?.name);
    if (!parsed.success) throw new AdminTeamError(422, parsed.error.issues[0]?.message ?? "Nombre inválido");
    const newName = parsed.data;
    if (newName.toLowerCase() === team.name.toLowerCase()) throw new AdminTeamError(422, "El nombre no cambió");
    await ensureUniqueName(db, newName, id);
    await db.update(schema.teams).set({ name: newName, updatedAt: ts }).where(eq(schema.teams.id, id)).run();
    // Sincroniza y consolida el vínculo: miembros por nombre antiguo quedan con teamId + nombre canónico.
    await db
      .update(schema.registrations)
      .set({ teamId: id, teamName: newName })
      .where(or(eq(schema.registrations.teamId, id), dsql`lower(${schema.registrations.teamName}) = lower(${team.name})`))
      .run();
    return { message: `Equipo renombrado a "${newName}"` };
  }

  // delete: los corredores conservan el texto del equipo; solo se quita el vínculo estructural.
  const linked = await db
    .select({ n: count() })
    .from(schema.registrations)
    .where(eq(schema.registrations.teamId, id))
    .get();
  await db
    .update(schema.registrations)
    .set({ teamId: null, updatedAt: ts })
    .where(eq(schema.registrations.teamId, id))
    .run();
  await db.delete(schema.teams).where(eq(schema.teams.id, id)).run();
  const n = linked?.n ?? 0;
  return {
    message: `Equipo "${team.name}" eliminado${n > 0 ? ` — ${n} inscripción(es) conservan el nombre como texto` : ""}`,
  };
}
