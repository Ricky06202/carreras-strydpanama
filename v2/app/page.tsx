import Link from "next/link";
import { HeroV2 } from "@/components/effects/HeroV2";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getActiveRaces } from "@/lib/db/queries";
import { formatDateEs, formatMoney, raceImageUrl, STATUS_META } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const races = await getActiveRaces();

  return (
    <>
      <HeroV2 />

      <section id="carreras" className="border-t border-hairline bg-abyss">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">
            // Carreras
          </p>

          {races.length === 0 ? (
            <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
              <p className="font-display text-xl text-snow">No hay carreras abiertas ahora mismo</p>
              <p className="mt-2 text-sm text-mist">Vuelve pronto — la próxima temporada se anuncia aquí primero.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {races.map((race) => {
                const img = raceImageUrl(race.imageUrl);
                const status = STATUS_META[race.status];
                const cupos = race.maxParticipants ?? 0;
                const llenos = cupos > 0 && race.confirmedCount >= cupos;
                return (
                  <Link
                    key={race.id}
                    href={`/carrera/${race.slug}`}
                    className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-carbon shadow-card transition-all duration-300 hover:border-stryd/40 hover:shadow-glow-soft"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-steel">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={race.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-end bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,var(--color-stryd-glow),transparent_70%)] p-6">
                          <span className="font-display text-6xl font-bold tracking-tight text-white/10">
                            STRYD
                          </span>
                        </div>
                      )}
                      <div className="absolute left-4 top-4">
                        <Badge tone={race.status === "accepting" ? "stryd" : "neutral"}>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status.dot === "live" ? "animate-glow-pulse bg-stryd" : "bg-mist"
                            }`}
                          />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-6">
                      <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-snow group-hover:text-stryd">
                        {race.title}
                      </h2>
                      {race.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-mist">{race.description}</p>
                      )}

                      <div className="mt-auto grid gap-1 pt-3 font-mono text-xs text-fog">
                        <p>
                          <span className="text-mist">FECHA · </span>
                          {formatDateEs(race.date)}
                        </p>
                        <p>
                          <span className="text-mist">LUGAR · </span>
                          {race.location ?? "Por anunciar"}
                        </p>
                        <p>
                          <span className="text-mist">CUPOS · </span>
                          {race.confirmedCount}
                          {cupos > 0 ? ` / ${cupos}` : ""} inscritos
                          {llenos ? " — lleno" : ""}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-4">
                        <span className="font-display text-lg font-bold text-stryd">{formatMoney(race.price)}</span>
                        <Button asChild variant="outline" size="sm">
                          <span className="group-hover:border-stryd/60 group-hover:text-stryd">Ver detalles →</span>
                        </Button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-hairline bg-void">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-16 text-center">
          <p className="font-display text-2xl font-bold text-snow">¿Corres con datos?</p>
          <p className="max-w-xl text-sm leading-relaxed text-mist">
            Cronometraje oficial con tecnología de vestir para las carreras de Panamá. Resultados al instante,
            certificado digital y análisis de tu carrera.
          </p>
          <Button asChild size="lg">
            <a href="#carreras">Ver todas las carreras</a>
          </Button>
        </div>
      </section>
    </>
  );
}
