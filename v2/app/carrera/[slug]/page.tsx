import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PosterViewer } from "@/components/site/PosterViewer";
import { getRaceBySlug } from "@/lib/db/queries";
import { formatDateEs, formatMoney, formatRaceTime, raceImageUrl, STATUS_META } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);
  if (!race) return { title: "Carrera no encontrada" };
  return {
    title: race.title,
    description: race.description ?? `${race.title} — ${formatDateEs(race.date)}`,
  };
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);
  if (!race) notFound();

  const img = raceImageUrl(race.imageUrl);
  const status = STATUS_META[race.status];
  const inscripcionesUrl = `/carrera/${race.slug}/inscribirse`;
  const open = race.status === "accepting";
  const cuposRestantes = race.maxParticipants ? Math.max(0, race.maxParticipants - race.confirmedCount) : null;

  return (
    <>
      <header className="relative overflow-hidden border-b border-hairline bg-abyss">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--color-stryd-glow),transparent_65%)] opacity-25" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-5 pb-14 pt-24 sm:pt-28 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-14">
          {img && (
            <div className="mx-auto w-full max-w-[320px] sm:max-w-[380px] lg:max-w-none">
              <PosterViewer src={img} alt={`Afiche oficial de ${race.title}`} />
            </div>
          )}
          <div className="flex flex-col gap-5">
            <Badge tone={open ? "stryd" : "neutral"} className="w-fit">
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot === "live" ? "animate-glow-pulse bg-stryd" : "bg-mist"}`} />
              {status.label}
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">{race.title}</h1>
            {race.description && <p className="max-w-2xl text-lg text-fog">{race.description}</p>}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm text-mist">
              <span className="text-stryd">{formatMoney(race.price)}</span>
              <span>{formatDateEs(race.date)}</span>
              {race.startTime && <span>{formatRaceTime(race.startTime)}</span>}
              <span>{race.location}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {open ? (
                <Button asChild size="lg">
                  <Link href={inscripcionesUrl}>Inscribirme</Link>
                </Button>
              ) : (
                <Button variant="secondary" size="lg" disabled>
                  Inscripciones cerradas
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link href="/">Volver a carreras</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Modalidades</p>
            <p className="mt-2 font-display text-3xl font-bold">{race.distances.length || "—"}</p>
            <p className="mt-1 text-sm text-fog">
              {race.distances.map((d) => `${d.kilometers}K`).join(" · ") || "Por anunciar"}
            </p>
          </Card>
          <Card className="p-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Cupos</p>
            <p className="mt-2 font-display text-3xl font-bold">
              {race.confirmedCount}
              {race.maxParticipants ? <span className="text-mist"> / {race.maxParticipants}</span> : null}
            </p>
            <p className="mt-1 text-sm text-fog">
              {cuposRestantes !== null && cuposRestantes > 0
                ? `${cuposRestantes} disponibles`
                : cuposRestantes === 0
                  ? "Cupos llenos"
                  : "Inscritos confirmados"}
              {race.preinscritoCount > 0 ? ` · ${race.preinscritoCount} preinscritos` : ""}
            </p>
          </Card>
        </div>
      </section>

      {race.distances.length > 0 && (
        <section className="border-t border-hairline bg-abyss">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Modalidades</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {race.distances.map((d) => (
                <Card key={d.id} className="p-6">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl font-bold">{d.kilometers}K</h3>
                    <span className="font-mono text-sm text-stryd">{formatMoney(d.price ?? race.price)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-fog">{d.title}</p>
                  {d.description && <p className="mt-3 text-sm leading-relaxed text-mist">{d.description}</p>}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {race.categories.length > 0 && (
        <section className="border-t border-hairline bg-void">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Categorías</p>
            <div className="overflow-x-auto rounded-card border border-hairline">
              <table className="w-full text-left text-sm">
                <thead className="bg-carbon font-mono text-xs uppercase tracking-wider text-mist">
                  <tr>
                    <th className="px-5 py-3.5">Categoría</th>
                    <th className="px-5 py-3.5">Edades</th>
                    <th className="px-5 py-3.5">Género</th>
                  </tr>
                </thead>
                <tbody>
                  {race.categories.map((c) => (
                    <tr key={c.id} className="border-t border-hairline">
                      <td className="px-5 py-3.5 font-semibold text-snow">{c.title}</td>
                      <td className="px-5 py-3.5 font-mono text-fog">
                        {c.minAge}–{c.maxAge > 90 ? "+" : c.maxAge}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-mist">{c.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {(race.technicalInfo || race.termsAndConditions) && (
        <section className="border-t border-hairline bg-abyss">
          <div className="mx-auto max-w-4xl space-y-6 px-5 py-14">
            {race.technicalInfo && (
              <div>
                <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Info técnica</p>
                <Card className="whitespace-pre-line p-6 text-sm leading-relaxed text-fog">
                  {race.technicalInfo}
                </Card>
              </div>
            )}
            {race.termsAndConditions && (
              <details id="terminos" className="group scroll-mt-24">
                <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-[0.3em] text-mist transition-colors hover:text-stryd">
                  Términos y condiciones <span className="ml-1 inline-block transition-transform group-open:rotate-90">→</span>
                </summary>
                <Card className="mt-4 whitespace-pre-line p-6 text-sm leading-relaxed text-mist">
                  {race.termsAndConditions}
                </Card>
              </details>
            )}
          </div>
        </section>
      )}
    </>
  );
}
