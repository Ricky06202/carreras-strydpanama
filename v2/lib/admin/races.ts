import { and, asc, count, eq, inArray, notInArray, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, type Db } from "@/lib/db";

export class RaceAdminError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const distanceSchema = z.object({
  id: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(60),
  kilometers: z.coerce.number().min(0.1).max(500),
  price: z.coerce.number().min(0).max(10000).nullable().optional(),
});

export const categorySchema = z.object({
  id: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(60),
  minAge: z.coerce.number().int().min(5).max(99),
  maxAge: z.coerce.number().int().min(6).max(120),
  gender: z.enum(["masculino", "femenino", "ambos"]),
});

export const raceCoreSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha YYYY-MM-DD"),
  startTime: z.string().trim().max(10).optional(),
  location: z.string().trim().max(160).optional(),
  description: z.string().max(4000).optional(),
  price: z.coerce.number().min(0).max(10000),
  platformFee: z.coerce.number().min(0).max(2000),
  maxParticipants: z.coerce.number().int().min(1).max(50000).nullish(),
  status: z.enum(["upcoming", "accepting", "closed", "active", "finished"]),
  showTimer: z.boolean(),
  showShirtSize: z.boolean(),
  teamEnabled: z.boolean(),
  padrinoEnabled: z.boolean(),
  startingBib: z.coerce.number().int().min(1).max(99999).nullish(),
});

export const raceFullSchema = raceCoreSchema.extend({
  distances: z.array(distanceSchema).min(1).max(12),
  categories: z.array(categorySchema).min(1).max(60),
});

export type RaceCoreInput = z.infer<typeof raceCoreSchema>;
export type RaceFullInput = z.infer<typeof raceFullSchema>;

export type RaceListItem = {
  id: string;
  slug: string;
  title: string;
  date: string;
  status: string;
  price: number;
  inscritos: number;
  preinscritos: number;
};

export async function listRacesAdmin(): Promise<RaceListItem[]> {
  const db = getDb();
  const races = await db.select().from(schema.races).orderBy(desc(schema.races.date)).limit(100).all();
  if (races.length === 0) return [];
  const rows = await db
    .select({ raceId: schema.registrations.raceId, status: schema.registrations.status, n: count() })
    .from(schema.registrations)
    .where(inArray(schema.registrations.raceId, races.map((r) => r.id)))
    .groupBy(schema.registrations.raceId, schema.registrations.status);
  const byRace = new Map<string, { inscrito: number; pre: number }>();
  for (const r of rows) {
    const cur = byRace.get(r.raceId) ?? { inscrito: 0, pre: 0 };
    if (r.status === "inscrito") cur.inscrito += r.n;
    if (r.status === "preinscrito") cur.pre += r.n;
    byRace.set(r.raceId, cur);
  }
  return races.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    date: r.date,
    status: r.status,
    price: r.price,
    inscritos: byRace.get(r.id)?.inscrito ?? 0,
    preinscritos: byRace.get(r.id)?.pre ?? 0,
  }));
}

export async function getRaceAdmin(slug: string) {
  const db = getDb();
  const race = await db.select().from(schema.races).where(eq(schema.races.slug, slug)).get();
  if (!race) throw new RaceAdminError(404, "Carrera no encontrada");
  const [distances, categories] = await Promise.all([
    db.select().from(schema.raceDistances).where(eq(schema.raceDistances.raceId, race.id)).orderBy(asc(schema.raceDistances.sortOrder)).all(),
    db.select().from(schema.raceCategories).where(eq(schema.raceCategories.raceId, race.id)).orderBy(asc(schema.raceCategories.minAge)).all(),
  ]);
  return { race, distances, categories };
}

async function assertSlugFree(db: Db, slug: string, exceptId?: string) {
  const clash = await db.select({ id: schema.races.id }).from(schema.races).where(eq(schema.races.slug, slug)).get();
  if (clash && clash.id !== exceptId) throw new RaceAdminError(409, `El slug "${slug}" ya lo usa otra carrera`);
}

export async function createRace(input: RaceCoreInput): Promise<{ id: string; slug: string }> {
  const db = getDb();
  await assertSlugFree(db, input.slug);
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  await db
    .insert(schema.races)
    .values({
      id,
      slug: input.slug,
      title: input.title,
      description: input.description || null,
      date: input.date,
      startTime: input.startTime || null,
      location: input.location || null,
      price: input.price,
      platformFee: input.platformFee,
      maxParticipants: input.maxParticipants ?? null,
      status: input.status,
      showTimer: input.showTimer,
      showShirtSize: input.showShirtSize,
      teamEnabled: input.teamEnabled,
      padrinoEnabled: input.padrinoEnabled,
      startingBib: input.startingBib ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  // una modalidad y una categoría por defecto para poder inscribir de inmediato
  await db
    .insert(schema.raceDistances)
    .values({ id: crypto.randomUUID(), raceId: id, title: "General", kilometers: 5, price: input.price, sortOrder: 0 })
    .run();
  await db
    .insert(schema.raceCategories)
    .values({ id: crypto.randomUUID(), raceId: id, title: "General", minAge: 18, maxAge: 120, gender: "ambos" })
    .run();
  return { id, slug: input.slug };
}

export async function updateRace(slug: string, input: RaceFullInput) {
  const db = getDb();
  const race = await db.select().from(schema.races).where(eq(schema.races.slug, slug)).get();
  if (!race) throw new RaceAdminError(404, "Carrera no encontrada");
  if (input.slug !== slug) await assertSlugFree(db, input.slug, race.id);

  const ts = new Date().toISOString();
  await db
    .update(schema.races)
    .set({
      slug: input.slug,
      title: input.title,
      description: input.description || null,
      date: input.date,
      startTime: input.startTime || null,
      location: input.location || null,
      price: input.price,
      platformFee: input.platformFee,
      maxParticipants: input.maxParticipants ?? null,
      status: input.status,
      showTimer: input.showTimer,
      showShirtSize: input.showShirtSize,
      teamEnabled: input.teamEnabled,
      padrinoEnabled: input.padrinoEnabled,
      startingBib: input.startingBib ?? null,
      updatedAt: ts,
    })
    .where(eq(schema.races.id, race.id))
    .run();

  // diff de modalidades
  const keepD = input.distances.map((d) => d.id).filter((x): x is string => !!x);
  if (keepD.length === 0) {
    await db.delete(schema.raceDistances).where(eq(schema.raceDistances.raceId, race.id)).run();
  } else {
    await db.delete(schema.raceDistances).where(and(eq(schema.raceDistances.raceId, race.id), notInArray(schema.raceDistances.id, keepD))).run();
  }
  for (const [i, d] of input.distances.entries()) {
    if (d.id) {
      await db
        .update(schema.raceDistances)
        .set({ title: d.title, kilometers: d.kilometers, price: d.price ?? null, sortOrder: i })
        .where(and(eq(schema.raceDistances.id, d.id), eq(schema.raceDistances.raceId, race.id)))
        .run();
    } else {
      await db
        .insert(schema.raceDistances)
        .values({ id: crypto.randomUUID(), raceId: race.id, title: d.title, kilometers: d.kilometers, price: d.price ?? null, sortOrder: i })
        .run();
    }
  }

  // diff de categorías
  const keepC = input.categories.map((c) => c.id).filter((x): x is string => !!x);
  if (keepC.length === 0) {
    await db.delete(schema.raceCategories).where(eq(schema.raceCategories.raceId, race.id)).run();
  } else {
    await db.delete(schema.raceCategories).where(and(eq(schema.raceCategories.raceId, race.id), notInArray(schema.raceCategories.id, keepC))).run();
  }
  for (const c of input.categories) {
    if (c.maxAge < c.minAge) throw new RaceAdminError(422, `Categoría "${c.title}": edad máxima menor que la mínima`);
    if (c.id) {
      await db
        .update(schema.raceCategories)
        .set({ title: c.title, minAge: c.minAge, maxAge: c.maxAge, gender: c.gender })
        .where(and(eq(schema.raceCategories.id, c.id), eq(schema.raceCategories.raceId, race.id)))
        .run();
    } else {
      await db
        .insert(schema.raceCategories)
        .values({ id: crypto.randomUUID(), raceId: race.id, title: c.title, minAge: c.minAge, maxAge: c.maxAge, gender: c.gender })
        .run();
    }
  }

  return getRaceAdmin(input.slug);
}
