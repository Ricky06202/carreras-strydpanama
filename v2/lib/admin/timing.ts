import { and, asc, count, countDistinct, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export class AdminTimingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const CHECKPOINTS = ["finish", "checkpoint"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

/** "1:12:34" | "12:34" → segundos. */
export function parseTimeSec(v: string): number | null {
  const clean = v.trim().replace(/\s+/g, "");
  if (!/^\d{1,2}(:\d{1,2}){1,2}$/.test(clean)) return null;
  const p = clean.split(":").map(Number);
  const sec = p.length === 3 ? p[0]! * 3600 + p[1]! * 60 + p[2]! : p[0]! * 60 + p[1]!;
  return sec > 0 && sec < 24 * 3600 ? sec : null;
}

export function formatTimeSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export type AdminTimingEventItem = {
  id: string;
  bib: number | null;
  title: string | null;
  checkpoint: string;
  elapsedSec: number;
  source: string;
  recordedAtMs: number;
};

export type AdminTimingStats = { finishers: number; checkpointed: number; inscritos: number };

export type AdminTimerInfo = { id: string; status: string; timerStartMs: number | null; timerStopMs: number | null };

export async function adminListTiming(raceId: string): Promise<{ events: AdminTimingEventItem[]; stats: AdminTimingStats; race: AdminTimerInfo | null }> {
  const db = getDb();
  const [events, distinctFinish, distinctCk, inscritos, raceRow] = await Promise.all([
    db
      .select({
        id: schema.timingEvents.id,
        bib: schema.timingEvents.bibNumber,
        title: schema.registrations.title,
        checkpoint: schema.timingEvents.checkpoint,
        elapsedSec: schema.timingEvents.elapsedSec,
        source: schema.timingEvents.source,
        recordedAtMs: schema.timingEvents.recordedAtMs,
      })
      .from(schema.timingEvents)
      .leftJoin(schema.registrations, eq(schema.timingEvents.registrationId, schema.registrations.id))
      .where(eq(schema.timingEvents.raceId, raceId))
      .orderBy(desc(schema.timingEvents.recordedAtMs))
      .limit(200)
      .all(),
    db
      .select({ n: countDistinct(schema.timingEvents.registrationId) })
      .from(schema.timingEvents)
      .where(and(eq(schema.timingEvents.raceId, raceId), eq(schema.timingEvents.checkpoint, "finish")))
      .get(),
    db
      .select({ n: countDistinct(schema.timingEvents.registrationId) })
      .from(schema.timingEvents)
      .where(and(eq(schema.timingEvents.raceId, raceId), eq(schema.timingEvents.checkpoint, "checkpoint")))
      .get(),
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.raceId, raceId), ne(schema.registrations.status, "anulado")))
      .get(),
    db
      .select({
        id: schema.races.id,
        status: schema.races.status,
        timerStartMs: schema.races.timerStartMs,
        timerStopMs: schema.races.timerStopMs,
      })
      .from(schema.races)
      .where(eq(schema.races.id, raceId))
      .get(),
  ]);
  return {
    events,
    stats: { finishers: distinctFinish?.n ?? 0, checkpointed: distinctCk?.n ?? 0, inscritos: inscritos?.n ?? 0 },
    race: (raceRow as AdminTimerInfo | undefined) ?? null,
  };
}

/** Registro manual de un tiempo (meta o punto de control). Sobreescrive con historial en eventos. */
export async function recordTiming(opts: {
  raceId: string;
  bib: number;
  timeSec?: number;
  checkpoint: Checkpoint;
  source?: "manual" | "camera";
  confidence?: number;
}): Promise<{ message: string }> {
  const db = getDb();
  const src = opts.source ?? "manual";
  const conf = opts.confidence ?? (src === "camera" ? 0.9 : 1);
  // Sin tiempo explícito = tomarlo del cronómetro vivo (igual que v1: dorsal + enter).
  let timeSec = opts.timeSec;
  if (timeSec == null) {
    const race = await db
      .select({ timerStartMs: schema.races.timerStartMs, timerStopMs: schema.races.timerStopMs })
      .from(schema.races)
      .where(eq(schema.races.id, opts.raceId))
      .get();
    if (!race?.timerStartMs) throw new AdminTimingError(409, "El cronómetro no está en marcha — registra con tiempo manual");
    if (race.timerStopMs) throw new AdminTimingError(409, "Cronómetro detenido — corrige con tiempo manual");
    timeSec = Math.max(1, Math.round((Date.now() - race.timerStartMs) / 1000));
  }
  const reg = await db
    .select()
    .from(schema.registrations)
    .where(and(eq(schema.registrations.raceId, opts.raceId), eq(schema.registrations.bibNumber, opts.bib)))
    .get();
  if (!reg) throw new AdminTimingError(404, `El dorsal ${opts.bib} no existe en esta carrera`);
  if (reg.status === "anulado") throw new AdminTimingError(409, `${reg.title} está anulado`);

  const ts = new Date().toISOString();
  await db
    .insert(schema.timingEvents)
    .values({
      id: crypto.randomUUID(),
      raceId: opts.raceId,
      registrationId: reg.id,
      bibNumber: opts.bib,
      checkpoint: opts.checkpoint,
      elapsedSec: timeSec,
      source: src,
      recordedAtMs: Date.now(),
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  const patch =
    opts.checkpoint === "finish"
      ? { finishTimeSec: timeSec, checkpointTimeSec: reg.checkpointTimeSec }
      : { checkpointTimeSec: timeSec };
  await db
    .update(schema.registrations)
    .set({ ...patch, timingSource: src, timingConfidence: conf, updatedAt: ts })
    .where(eq(schema.registrations.id, reg.id))
    .run();

  const corregido = opts.checkpoint === "finish" ? reg.finishTimeSec != null : reg.checkpointTimeSec != null;
  return {
    message: `#${opts.bib} ${reg.title} — ${formatTimeSec(timeSec)}${corregido ? " (corregido)" : ""}`,
  };
}

/** Arrancar/detener/reiniciar el cronómetro de carrera (espejo del flujo v1). */
export async function setRaceTimer(raceId: string, action: "start" | "stop" | "reset"): Promise<{ message: string }> {
  const db = getDb();
  const race = await db
    .select({ status: schema.races.status, timerStartMs: schema.races.timerStartMs, timerStopMs: schema.races.timerStopMs })
    .from(schema.races)
    .where(eq(schema.races.id, raceId))
    .get();
  if (!race) throw new AdminTimingError(404, "Carrera no encontrada");
  const ts = new Date().toISOString();

  if (action === "start") {
    if (race.timerStartMs && !race.timerStopMs) throw new AdminTimingError(409, "El cronómetro ya está corriendo");
    await db
      .update(schema.races)
      .set({ timerStartMs: Date.now(), timerStopMs: null, status: "active", updatedAt: ts })
      .where(eq(schema.races.id, raceId))
      .run();
    return { message: "🏁 Carrera iniciada — el cronómetro corre" };
  }
  if (action === "stop") {
    if (!race.timerStartMs) throw new AdminTimingError(409, "No hay cronómetro iniciado");
    if (race.timerStopMs) throw new AdminTimingError(409, "Ya estaba detenido");
    await db.update(schema.races).set({ timerStopMs: Date.now(), updatedAt: ts }).where(eq(schema.races.id, raceId)).run();
    return { message: "Cronómetro detenido — para finales tardíos usa tiempo manual" };
  }
  await db
    .update(schema.races)
    .set({ timerStartMs: null, timerStopMs: null, status: "accepting", updatedAt: ts })
    .where(eq(schema.races.id, raceId))
    .run();
  return { message: "Cronómetro reiniciado (la carrera vuelve a inscripciones)" };
}

/** Deshacer: borra el evento y retrocede la inscripción al tiempo anterior (si existe). */
export async function deleteTimingEvent(id: string): Promise<{ message: string }> {
  const db = getDb();
  const ev = await db.select().from(schema.timingEvents).where(eq(schema.timingEvents.id, id)).get();
  if (!ev) throw new AdminTimingError(404, "Registro no encontrado");

  await db.delete(schema.timingEvents).where(eq(schema.timingEvents.id, id)).run();

  if (ev.registrationId) {
    const prev = await db
      .select()
      .from(schema.timingEvents)
      .where(and(eq(schema.timingEvents.registrationId, ev.registrationId), eq(schema.timingEvents.checkpoint, ev.checkpoint)))
      .orderBy(desc(schema.timingEvents.recordedAtMs))
      .get();
    const ts = new Date().toISOString();
    const patch =
      ev.checkpoint === "finish"
        ? { finishTimeSec: prev?.elapsedSec ?? null }
        : { checkpointTimeSec: prev?.elapsedSec ?? null };
    await db
      .update(schema.registrations)
      .set({ ...patch, updatedAt: ts })
      .where(eq(schema.registrations.id, ev.registrationId))
      .run();
  }
  return { message: `Borrado dorsal #${ev.bibNumber ?? "?"} (${ev.checkpoint === "finish" ? "meta" : "control"})` };
}

export type AdminResultRow = {
  pos: number;
  catPos: number | null;
  bib: number | null;
  name: string;
  time: string;
  category: string | null;
  distance: string | null;
  team: string | null;
};

/** Recalcula la tabla results: último evento por corredor (fallback: finishTimeSec en la ficha). */
export async function computeResults(raceId: string): Promise<{ message: string; total: number }> {
  const db = getDb();

  const [events, regs] = await Promise.all([
    db
      .select()
      .from(schema.timingEvents)
      .where(and(eq(schema.timingEvents.raceId, raceId), eq(schema.timingEvents.checkpoint, "finish")))
      .all(),
    db
      .select({
        id: schema.registrations.id,
        title: schema.registrations.title,
        status: schema.registrations.status,
        categoryId: schema.registrations.categoryId,
        finishTimeSec: schema.registrations.finishTimeSec,
      })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.raceId, raceId), ne(schema.registrations.status, "anulado")))
      .all(),
  ]);

  const best = new Map<string, { sec: number; at: number }>();
  for (const e of events) {
    if (!e.registrationId) continue;
    const cur = best.get(e.registrationId);
    if (!cur || e.recordedAtMs >= cur.at) best.set(e.registrationId, { sec: e.elapsedSec, at: e.recordedAtMs });
  }

  const finishers = regs
    .map((r) => ({ id: r.id, sec: best.get(r.id)?.sec ?? r.finishTimeSec ?? null, catId: r.categoryId }))
    .filter((r): r is { id: string; sec: number; catId: string | null } => r.sec != null)
    .sort((a, b) => a.sec - b.sec);

  const catCount = new Map<string, number>();
  const ts = new Date().toISOString();
  const rows = finishers.map((f, i) => {
    let catPos: number | null = null;
    if (f.catId) {
      const n = (catCount.get(f.catId) ?? 0) + 1;
      catCount.set(f.catId, n);
      catPos = n;
    }
    return {
      id: crypto.randomUUID(),
      raceId,
      registrationId: f.id,
      finishTimeSec: f.sec,
      categoryPosition: catPos,
      overallPosition: i + 1,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  await db.batch([
    db.delete(schema.results).where(eq(schema.results.raceId, raceId)),
    ...(rows.length > 0 ? [db.insert(schema.results).values(rows)] : []),
  ] as never);

  return { message: `Resultados recalculados — ${rows.length} finisher(es)`, total: rows.length };
}

export async function listResults(raceId: string): Promise<{ rows: AdminResultRow[] }> {
  const db = getDb();
  const rows = await db
    .select({
      pos: schema.results.overallPosition,
      catPos: schema.results.categoryPosition,
      bib: schema.registrations.bibNumber,
      name: schema.registrations.title,
      time: schema.results.finishTimeSec,
      category: schema.raceCategories.title,
      distance: schema.raceDistances.title,
      team: schema.registrations.teamName,
    })
    .from(schema.results)
    .innerJoin(schema.registrations, eq(schema.results.registrationId, schema.registrations.id))
    .leftJoin(schema.raceCategories, eq(schema.registrations.categoryId, schema.raceCategories.id))
    .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
    .where(eq(schema.results.raceId, raceId))
    .orderBy(asc(schema.results.overallPosition))
    .limit(400)
    .all();

  return {
    rows: rows.map((r) => ({
      pos: r.pos ?? 0,
      catPos: r.catPos,
      bib: r.bib,
      name: r.name ?? "",
      time: r.time != null ? formatTimeSec(r.time) : "—",
      category: r.category,
      distance: r.distance,
      team: r.team,
    })),
  };
}

/** CSV con BOM para Excel panameño. */
export async function buildResultsCsv(raceId: string): Promise<{ csv: string; filename: string } | null> {
  const db = getDb();
  const race = await db.select({ slug: schema.races.slug }).from(schema.races).where(eq(schema.races.id, raceId)).get();
  if (!race) return null;
  const { rows } = await listResults(raceId);
  const esc = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = "Puesto,Puesto cat.,Dorsal,Tiempo,Nombre,Categoria,Modalidad,Equipo";
  const lines = rows.map((r) => [r.pos, r.catPos ?? "", r.bib ?? "", r.time, r.name, r.category ?? "", r.distance ?? "", r.team ?? ""].map(esc).join(","));
  return { csv: `\uFEFF${head}\r\n${lines.join("\r\n")}\r\n`, filename: `${race.slug}-resultados.csv` };
}
