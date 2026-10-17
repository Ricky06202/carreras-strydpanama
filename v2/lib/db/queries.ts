import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
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

export type PublicResultRow = {
  pos: number | null;
  catPos: number | null;
  bib: number | null;
  name: string;
  timeSec: number;
  category: string | null;
  distance: string | null;
  team: string | null;
};

/** Carreras que ya tienen resultados consolidados (para /resultados). */
export async function getRacesWithResults(): Promise<
  { slug: string; title: string; date: string; imageUrl: string | null; finishers: number }[]
> {
  const db = getDb();
  return db
    .select({
      slug: schema.races.slug,
      title: schema.races.title,
      date: schema.races.date,
      imageUrl: schema.races.imageUrl,
      finishers: count(),
    })
    .from(schema.results)
    .innerJoin(schema.races, eq(schema.results.raceId, schema.races.id))
    .groupBy(schema.races.slug, schema.races.title, schema.races.date, schema.races.imageUrl)
    .orderBy(desc(schema.races.date))
    .all();
}

/** Tabla completa de resultados de una carrera por slug (podio + lista). */
export async function getRaceResults(slug: string): Promise<{ title: string; date: string; rows: PublicResultRow[] } | null> {
  const db = getDb();
  const race = await db
    .select({ id: schema.races.id, title: schema.races.title, date: schema.races.date })
    .from(schema.races)
    .where(eq(schema.races.slug, slug))
    .get();
  if (!race) return null;
  const rows = await db
    .select({
      pos: schema.results.overallPosition,
      catPos: schema.results.categoryPosition,
      bib: schema.registrations.bibNumber,
      name: schema.registrations.title,
      timeSec: schema.results.finishTimeSec,
      category: schema.raceCategories.title,
      distance: schema.raceDistances.title,
      team: schema.registrations.teamName,
    })
    .from(schema.results)
    .innerJoin(schema.registrations, eq(schema.results.registrationId, schema.registrations.id))
    .leftJoin(schema.raceCategories, eq(schema.registrations.categoryId, schema.raceCategories.id))
    .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
    .where(eq(schema.results.raceId, race.id))
    .orderBy(asc(schema.results.overallPosition))
    .all();
  return {
    title: race.title,
    date: race.date,
    rows: rows.map((r) => ({ ...r, name: r.name ?? "" })) as PublicResultRow[],
  };
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

// ---------------------------------------------------------------------------
// Directorio publico de atletas (/atletas)
// ---------------------------------------------------------------------------

/**
 * Campos que el atleta puede ocultar desde `runners.public_fields` (JSON array).
 * Cedula, email, telefono, fecha de nacimiento y credenciales NO estan en esta
 * lista y jamas se seleccionan en las consultas publicas.
 */
export const ATHLETE_OPTIONAL_FIELDS = ["bio", "instagram", "photoUrl", "personalRecords"] as const;
type AthleteOptionalField = (typeof ATHLETE_OPTIONAL_FIELDS)[number];

export type LatestRace = { title: string; date: string };

export type PublicAthleteRow = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  country: string | null;
  bio: string | null;
  instagram: string | null;
  totalRaces: number;
  latestRace: LatestRace | null;
};

export type AthleteHistoryEntry = {
  raceTitle: string;
  raceSlug: string;
  date: string;
  distance: string | null;
  bibNumber: number | null;
  finishTimeSec: number | null;
  checkpointTimeSec: number | null;
};

export type AthleteProfile = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  country: string | null;
  bio: string | null;
  instagram: string | null;
  totalRaces: number;
  history: AthleteHistoryEntry[];
};

/** public_fields -> set de campos permitidos; null = todos los opcionales son publicos. */
function parsePublicFields(raw: string | null): Set<AthleteOptionalField> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const allowed = new Set<AthleteOptionalField>();
  for (const value of parsed) {
    if (typeof value !== "string") continue;
    const key = value.trim();
    if ((ATHLETE_OPTIONAL_FIELDS as readonly string[]).includes(key)) allowed.add(key as AthleteOptionalField);
  }
  // Lista vacia o solo con campos desconocidos = preferencia invalida -> defaults.
  return allowed.size > 0 ? allowed : null;
}

function fieldIsPublic(fields: Set<AthleteOptionalField> | null, key: AthleteOptionalField): boolean {
  return fields === null || fields.has(key);
}

const fullNameSql = sql<string>`${schema.runners.firstName} || ' ' || ${schema.runners.lastName}`;

/**
 * Acentos que se pliegan al buscar: SQLite solo hace LIKE case-insensitive en
 * ASCII, asi que "perez" no encontraria "Pérez" sin esto.
 */
const ACCENT_FOLDS: [string, string][] = [
  ["á", "a"],
  ["é", "e"],
  ["í", "i"],
  ["ó", "o"],
  ["ú", "u"],
  ["ü", "u"],
  ["ñ", "n"],
  ["Á", "a"],
  ["É", "e"],
  ["Í", "i"],
  ["Ó", "o"],
  ["Ú", "u"],
  ["Ü", "u"],
  ["Ñ", "n"],
];

/** lower(replace(...)) sobre una columna, con los acentos del espanol plegados. */
function foldedText(expr: SQLWrapper): SQL {
  let out = sql`${expr}`;
  for (const [from, to] of ACCENT_FOLDS) out = sql`replace(${out}, ${from}, ${to})`;
  return sql`lower(${out})`;
}

/** Atletas con perfil publico, ordenados por cantidad de carreras confirmadas. */
export async function getPublicAthletes(opts: { q?: string; limit?: number } = {}): Promise<PublicAthleteRow[]> {
  const db = getDb();
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 60), 1), 100);
  // Los comodines de LIKE se descartan: la busqueda es literal, no un patron SQL.
  const term = (opts.q ?? "")
    .replace(/[%_\\]/g, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const pattern = `%${term}%`;

  const rows = await db
    .select({
      id: schema.runners.id,
      firstName: schema.runners.firstName,
      lastName: schema.runners.lastName,
      photoUrl: schema.runners.photoUrl,
      country: schema.runners.country,
      bio: schema.runners.bio,
      instagram: schema.runners.instagram,
      publicFields: schema.runners.publicFields,
      totalRaces: count(schema.registrations.id),
    })
    .from(schema.runners)
    .leftJoin(
      schema.registrations,
      and(eq(schema.registrations.runnerId, schema.runners.id), eq(schema.registrations.status, "inscrito")),
    )
    .where(
      term
        ? and(
            eq(schema.runners.publicProfile, true),
            or(
              like(foldedText(schema.runners.firstName), pattern),
              like(foldedText(schema.runners.lastName), pattern),
              like(foldedText(fullNameSql), pattern),
            ),
          )
        : eq(schema.runners.publicProfile, true),
    )
    .groupBy(schema.runners.id)
    .orderBy(desc(count(schema.registrations.id)), asc(schema.runners.firstName), asc(schema.runners.lastName))
    .limit(limit)
    .all();

  const ids = rows.map((r) => r.id);
  const latest = new Map<string, LatestRace>();
  if (ids.length > 0) {
    // Carrera mas reciente con inscripcion confirmada (una fila por atleta en JS).
    const raceRows = await db
      .select({ runnerId: schema.registrations.runnerId, title: schema.races.title, date: schema.races.date })
      .from(schema.registrations)
      .innerJoin(schema.races, eq(schema.registrations.raceId, schema.races.id))
      .where(and(inArray(schema.registrations.runnerId, ids), eq(schema.registrations.status, "inscrito")))
      .orderBy(desc(schema.races.date))
      .all();
    for (const row of raceRows) {
      if (!row.runnerId || latest.has(row.runnerId)) continue;
      latest.set(row.runnerId, { title: row.title, date: row.date });
    }
  }

  return rows.map((r) => {
    const fields = parsePublicFields(r.publicFields);
    return {
      id: r.id,
      fullName: `${r.firstName} ${r.lastName}`.trim(),
      photoUrl: fieldIsPublic(fields, "photoUrl") ? r.photoUrl : null,
      country: r.country,
      bio: fieldIsPublic(fields, "bio") ? r.bio : null,
      instagram: fieldIsPublic(fields, "instagram") ? r.instagram : null,
      totalRaces: r.totalRaces,
      latestRace: latest.get(r.id) ?? null,
    };
  });
}

/** Perfil publico de un atleta con su historial de carreras confirmadas. */
export async function getAthleteProfile(id: string): Promise<AthleteProfile | null> {
  if (!id) return null;
  const db = getDb();
  const [runner] = await db
    .select({
      id: schema.runners.id,
      firstName: schema.runners.firstName,
      lastName: schema.runners.lastName,
      country: schema.runners.country,
      photoUrl: schema.runners.photoUrl,
      bio: schema.runners.bio,
      instagram: schema.runners.instagram,
      publicFields: schema.runners.publicFields,
    })
    .from(schema.runners)
    .where(and(eq(schema.runners.id, id), eq(schema.runners.publicProfile, true)))
    .limit(1);
  if (!runner) return null;

  const history = await db
    .select({
      raceTitle: schema.races.title,
      raceSlug: schema.races.slug,
      date: schema.races.date,
      distance: schema.raceDistances.title,
      bibNumber: schema.registrations.bibNumber,
      finishTimeSec: schema.registrations.finishTimeSec,
      checkpointTimeSec: schema.registrations.checkpointTimeSec,
    })
    .from(schema.registrations)
    .innerJoin(schema.races, eq(schema.registrations.raceId, schema.races.id))
    .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
    .where(and(eq(schema.registrations.runnerId, runner.id), eq(schema.registrations.status, "inscrito")))
    .orderBy(desc(schema.races.date))
    .all();

  const fields = parsePublicFields(runner.publicFields);
  return {
    id: runner.id,
    fullName: `${runner.firstName} ${runner.lastName}`.trim(),
    photoUrl: fieldIsPublic(fields, "photoUrl") ? runner.photoUrl : null,
    country: runner.country,
    bio: fieldIsPublic(fields, "bio") ? runner.bio : null,
    instagram: fieldIsPublic(fields, "instagram") ? runner.instagram : null,
    totalRaces: history.length,
    history,
  };
}
