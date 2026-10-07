import { HeroV2 } from "@/components/effects/HeroV2";
import { RaceCard } from "@/components/site/RaceCard";
import { Button } from "@/components/ui/Button";
import { getActiveRaces } from "@/lib/db/queries";

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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {races.map((race) => (
                <RaceCard key={race.id} race={race} />
              ))}
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
