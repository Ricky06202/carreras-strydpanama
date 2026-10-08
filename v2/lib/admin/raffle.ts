import { and, asc, count, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export class AdminRaffleError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type RaffleWinnerItem = {
  id: string;
  registrationId: string;
  name: string;
  bib: number | null;
  prize: string | null;
  createdAt: string;
};

export type RaffleStats = { winners: number; inscribed: number; finishers: number };

export async function listRaffle(raceId: string): Promise<{ winners: RaffleWinnerItem[]; stats: RaffleStats }> {
  const db = getDb();
  const [winnerRows, inscribed, finishers] = await Promise.all([
    db
      .select({
        id: schema.raffleWinners.id,
        registrationId: schema.raffleWinners.registrationId,
        name: schema.registrations.title,
        bib: schema.registrations.bibNumber,
        prize: schema.raffleWinners.prize,
        createdAt: schema.raffleWinners.createdAt,
      })
      .from(schema.raffleWinners)
      .leftJoin(schema.registrations, eq(schema.raffleWinners.registrationId, schema.registrations.id))
      .where(eq(schema.raffleWinners.raceId, raceId))
      .orderBy(asc(schema.raffleWinners.createdAt))
      .all(),
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(and(eq(schema.registrations.raceId, raceId), eq(schema.registrations.status, "inscrito")))
      .get(),
    db
      .select({ n: count() })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.raceId, raceId),
          eq(schema.registrations.status, "inscrito"),
          isNotNull(schema.registrations.finishTimeSec),
        ),
      )
      .get(),
  ]);
  return {
    winners: winnerRows.map((w) => ({ ...w, name: w.name ?? "(inscripción borrada)" })),
    stats: { winners: winnerRows.length, inscribed: inscribed?.n ?? 0, finishers: finishers?.n ?? 0 },
  };
}

function randomInt(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % n;
}

/** Sortea 1 ganador entre elegibles (inscritos confirmados; opcional: solo finishers). Nunca repite a nadie. */
export async function drawWinner(opts: {
  raceId: string;
  prize?: string;
  finishersOnly?: boolean;
}): Promise<{ message: string; winner: RaffleWinnerItem }> {
  const db = getDb();
  const conds = [eq(schema.registrations.raceId, opts.raceId), eq(schema.registrations.status, "inscrito")];
  if (opts.finishersOnly) conds.push(isNotNull(schema.registrations.finishTimeSec));

  const [pool, taken] = await Promise.all([
    db
      .select({ id: schema.registrations.id, name: schema.registrations.title, bib: schema.registrations.bibNumber })
      .from(schema.registrations)
      .where(and(...conds))
      .all(),
    db
      .select({ registrationId: schema.raffleWinners.registrationId })
      .from(schema.raffleWinners)
      .where(eq(schema.raffleWinners.raceId, opts.raceId))
      .all(),
  ]);

  const takenSet = new Set(taken.map((t) => t.registrationId));
  const eligible = pool.filter((p) => !takenSet.has(p.id));
  if (eligible.length === 0) {
    throw new AdminRaffleError(409, "No hay elegibles sin premio (necesitas inscritos confirmados)");
  }

  const pick = eligible[randomInt(eligible.length)]!;
  const ts = new Date().toISOString();
  const prize = opts.prize?.trim() || "Premio general";
  const id = crypto.randomUUID();
  await db
    .insert(schema.raffleWinners)
    .values({ id, raceId: opts.raceId, registrationId: pick.id, prize, createdAt: ts, updatedAt: ts })
    .run();

  return {
    message: `🎉 ${pick.name}${pick.bib != null ? ` (#${pick.bib})` : ""} — ${prize}`,
    winner: { id, registrationId: pick.id, name: pick.name, bib: pick.bib, prize, createdAt: ts },
  };
}

export async function removeWinner(id: string): Promise<{ message: string }> {
  const db = getDb();
  const row = await db.select({ id: schema.raffleWinners.id }).from(schema.raffleWinners).where(eq(schema.raffleWinners.id, id)).get();
  if (!row) throw new AdminRaffleError(404, "Ganador no encontrado");
  await db.delete(schema.raffleWinners).where(eq(schema.raffleWinners.id, id)).run();
  return { message: "Ganador retirado del sorteo" };
}
