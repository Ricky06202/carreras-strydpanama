import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type RaceStatus = "upcoming" | "accepting" | "closed" | "active" | "finished";

export type PublicRace = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  location: string | null;
  imageUrl: string | null;
  price: number;
  maxParticipants: number | null;
  status: RaceStatus;
  teamEnabled: boolean;
  padrinoEnabled: boolean;
  confirmedCount: number;
};

export type RaceDetail = PublicRace & {
  technicalInfo: string | null;
  termsAndConditions: string | null;
  showShirtSize: boolean;
  platformFee: number;
  distances: { id: string; title: string; kilometers: number; price: number | null; description: string | null }[];
  categories: { id: string; title: string; minAge: number; maxAge: number; gender: string; description: string | null }[];
  preinscritoCount: number;
};

const PUBLIC_STATUSES: RaceStatus[] = ["accepting", "upcoming", "active", "closed"];

async function withCounts(raceIds: string[]) {
  if (raceIds.length === 0) return new Map<string, { confirmed: number; pre: number }>();
  const db = getDb();
  const rows = await db
    .select({
      raceId: schema.registrations.raceId,
      status: schema.registrations.status,
      n: count(),
    })
    .from(schema.registrations)
    .where(inArray(schema.registrations.raceId, raceIds))
    .groupBy(schema.registrations.raceId, schema.registrations.status);
  const map = new Map<string, { confirmed: number; pre: number }>();
  for (const r of rows) {
    const cur = map.get(r.raceId) ?? { confirmed: 0, pre: 0 };
    if (r.status === "inscrito") cur.confirmed += r.n;
    if (r.status === "preinscrito") cur.pre += r.n;
    map.set(r.raceId, cur);
  }
  return map;
}

export async function getActiveRaces(): Promise<PublicRace[]> {
  const db = getDb();
  const races = await db
    .select()
    .from(schema.races)
    .where(inArray(schema.races.status, PUBLIC_STATUSES))
    .orderBy(asc(schema.races.date));
  const counts = await withCounts(races.map((r) => r.id));
  return races.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    date: r.date,
    startTime: r.startTime,
    location: r.location,
    imageUrl: r.imageUrl,
    price: r.price,
    maxParticipants: r.maxParticipants,
    status: r.status as RaceStatus,
    teamEnabled: r.teamEnabled,
    padrinoEnabled: r.padrinoEnabled,
    confirmedCount: counts.get(r.id)?.confirmed ?? 0,
  }));
}

export async function getRaceBySlug(slug: string): Promise<RaceDetail | null> {
  const db = getDb();
  const [race] = await db.select().from(schema.races).where(eq(schema.races.slug, slug)).limit(1);
  if (!race) return null;

  const [distances, categories, counts] = await Promise.all([
    db
      .select()
      .from(schema.raceDistances)
      .where(eq(schema.raceDistances.raceId, race.id))
      .orderBy(asc(schema.raceDistances.sortOrder)),
    db
      .select()
      .from(schema.raceCategories)
      .where(eq(schema.raceCategories.raceId, race.id))
      .orderBy(asc(schema.raceCategories.minAge)),
    withCounts([race.id]),
  ]);
  const c = counts.get(race.id) ?? { confirmed: 0, pre: 0 };

  return {
    id: race.id,
    slug: race.slug,
    title: race.title,
    description: race.description,
    date: race.date,
    startTime: race.startTime,
    location: race.location,
    imageUrl: race.imageUrl,
    price: race.price,
    maxParticipants: race.maxParticipants,
    status: race.status as RaceStatus,
    teamEnabled: race.teamEnabled,
    padrinoEnabled: race.padrinoEnabled,
    technicalInfo: race.technicalInfo,
    termsAndConditions: race.termsAndConditions,
    showShirtSize: race.showShirtSize,
    platformFee: race.platformFee,
    confirmedCount: c.confirmed,
    preinscritoCount: c.pre,
    distances: distances.map((d) => ({
      id: d.id,
      title: d.title,
      kilometers: d.kilometers,
      price: d.price,
      description: d.description,
    })),
    categories: categories.map((cat) => ({
      id: cat.id,
      title: cat.title,
      minAge: cat.minAge,
      maxAge: cat.maxAge,
      gender: cat.gender,
      description: cat.description,
    })),
  };
}

export async function getNextRace(): Promise<PublicRace | null> {
  const active = await getActiveRaces();
  return active[0] ?? null;
}

export async function getRecentResults(raceId: string, limit = 10) {
  const db = getDb();
  return db
    .select({
      bib: schema.registrations.bibNumber,
      firstName: schema.registrations.firstName,
      lastName: schema.registrations.lastName,
      timeSec: schema.results.finishTimeSec,
      categoryPos: schema.results.categoryPosition,
      overallPos: schema.results.overallPosition,
    })
    .from(schema.results)
    .innerJoin(schema.registrations, eq(schema.results.registrationId, schema.registrations.id))
    .where(eq(schema.results.raceId, raceId))
    .orderBy(asc(schema.results.overallPosition))
    .limit(limit);
}
