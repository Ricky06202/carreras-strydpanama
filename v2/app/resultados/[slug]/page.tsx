import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRaceResults } from "@/lib/db/queries";
import { formatDateEs } from "@/lib/format";
import { ResultsBoard } from "@/components/site/ResultsBoard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRaceResults(slug);
  return {
    title: data ? `Resultados — ${data.title}` : "Resultados",
    description: data ? `Podio y tiempos oficiales de ${data.title}.` : "Resultados oficiales STRYD Panamá.",
  };
}

export default async function ResultadosRacePage({ params }: Props) {
  const { slug } = await params;
  const data = await getRaceResults(slug);
  if (!data) notFound();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-28">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Resultados</p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{data.title}</h1>
      <p className="mt-3 text-sm text-mist">
        {formatDateEs(data.date)}
        {data.rows.length > 0 ? ` · ${data.rows.length} finishers consolidados` : ""}
      </p>

      <div className="mt-10">
        {data.rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
            <p className="font-display text-xl text-snow">Resultados en camino</p>
            <p className="mt-2 text-sm text-mist">El equipo todavía está consolidando los tiempos de esta carrera.</p>
          </div>
        ) : (
          <ResultsBoard rows={data.rows} />
        )}
      </div>
    </section>
  );
}
