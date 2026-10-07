import type { Metadata } from "next";
import { RaceCard } from "@/components/site/RaceCard";
import { getActiveRaces } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carreras",
  description: "Todas las carreras de STRYD Panamá con inscripciones abiertas.",
};

export default async function CarrerasPage() {
  const races = await getActiveRaces();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-28">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Carreras</p>
      <h1 className="mb-10 font-display text-4xl font-bold tracking-tight sm:text-5xl">Calendario STRYD</h1>

      {races.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
          <p className="font-display text-xl text-snow">No hay carreras abiertas ahora mismo</p>
          <p className="mt-2 text-sm text-mist">Vuelve pronto — la próxima temporada se anuncia aquí primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </section>
  );
}
