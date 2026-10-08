import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { SITE, sendResultsEmail } from "@/lib/email";

export class AdminNotifyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const MAX_PER_RUN = 500;
const CONCURRENCY = 5;

/**
 * Envía por correo los resultados oficiales a cada finisher con resultado consolidado.
 * Requiere RESEND_API_KEY en el worker (runtime); en dev sin key los correos se reportan como fallidos.
 */
export async function sendRaceResults(raceId: string): Promise<{ sent: number; failed: number; skipped: number; message: string }> {
  const db = getDb();
  const race = await db
    .select({ slug: schema.races.slug, title: schema.races.title })
    .from(schema.races)
    .where(eq(schema.races.id, raceId))
    .get();
  if (!race) throw new AdminNotifyError(404, "Carrera no encontrada");

  const rows = await db
    .select({
      regId: schema.registrations.id,
      email: schema.registrations.email,
      firstName: schema.registrations.firstName,
      bib: schema.registrations.bibNumber,
      distanceTitle: schema.raceDistances.title,
      categoryTitle: schema.raceCategories.title,
      timeSec: schema.results.finishTimeSec,
      pos: schema.results.overallPosition,
      catPos: schema.results.categoryPosition,
    })
    .from(schema.results)
    .innerJoin(schema.registrations, eq(schema.results.registrationId, schema.registrations.id))
    .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
    .leftJoin(schema.raceCategories, eq(schema.registrations.categoryId, schema.raceCategories.id))
    .where(and(eq(schema.results.raceId, raceId), ne(schema.registrations.status, "anulado")))
    .all();

  if (rows.length === 0) throw new AdminNotifyError(409, "No hay resultados consolidados — pulsa «Recalcular» primero");
  const targets = rows.slice(0, MAX_PER_RUN);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (r) => {
        if (!r.email) return null;
        return sendResultsEmail({
          email: r.email,
          firstName: r.firstName || "corredor",
          raceTitle: race.title,
          raceSlug: race.slug,
          distanceTitle: r.distanceTitle,
          categoryTitle: r.categoryTitle,
          bibNumber: r.bib,
          timeLabel: fmtTime(r.timeSec),
          overallPos: r.pos,
          categoryPos: r.catPos,
          certificateUrl: `${SITE}/mi-portal/certificado/${r.regId}`,
        });
      }),
    );
    for (const ok of results) {
      if (ok === null) skipped++;
      else if (ok) sent++;
      else failed++;
    }
  }

  const remainder = rows.length - targets.length;
  return {
    sent,
    failed,
    skipped,
    message: `Resultados: ${sent} enviado(s), ${failed} fallido(s), ${skipped} omitido(s)${remainder > 0 ? ` — quedan ${remainder} para otro lote` : ""}`,
  };
}
