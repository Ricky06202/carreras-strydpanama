import type { Metadata } from "next";
import Link from "next/link";
import { getRacesWithResults } from "@/lib/db/queries";
import { formatDateEs, raceImageUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados",
  description: "Podios y resultados oficiales de las carreras STRYD Panamá.",
};

export default async function ResultadosPage() {
  const races = await getRacesWithResults();
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-28">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Resultados</p>
      <h1 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Podios y tiempos oficiales</h1>
      <p className="mb-10 max-w-xl text-sm text-mist">
        Cronometraje de meta, puesto por categoría y tabla completa de finishers. Se publica cuando el equipo consolida los tiempos de la
        carrera.
      </p>

      {races.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
          <p className="font-display text-xl text-snow">Aún no hay resultados consolidados</p>
          <p className="mt-2 text-sm text-mist">En cuanto termine la primera carrera con cronometraje, el podio sale aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {races.map((r) => {
            const img = raceImageUrl(r.imageUrl);
            return (
              <Link
                key={r.slug}
                href={`/resultados/${r.slug}`}
                className="group flex gap-4 rounded-card border border-hairline bg-carbon p-4 transition hover:border-stryd/50"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" loading="lazy" className="h-28 w-20 shrink-0 rounded-xl border border-hairline object-cover" />
                ) : (
                  <div className="h-28 w-20 shrink-0 rounded-xl bg-abyss ring-1 ring-inset ring-hairline" />
                )}
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-display truncate text-lg font-bold text-snow transition-colors group-hover:text-stryd">{r.title}</p>
                  <p className="mt-1 text-sm text-mist">{formatDateEs(r.date)}</p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-widest text-fog">{r.finishers} finishers →</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
