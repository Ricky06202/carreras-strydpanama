import type { Metadata } from "next";
import Link from "next/link";
import { AthleteAvatar } from "@/components/site/AthleteAvatar";
import { getPublicAthletes } from "@/lib/db/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/atletas",
  title: "Atletas",
  description:
    "Directorio de atletas de Stryd Panamá: perfiles públicos, carreras disputadas y tiempos oficiales de los corredores de la comunidad.",
});

type SearchParams = { [k: string]: string | string[] | undefined };
const uno = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/** Buscador sin JavaScript: el formulario viaja como GET a /atletas?q=... */
const inputClass =
  "h-12 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";

export default async function AtletasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = uno(sp.q).trim().slice(0, 80);
  const athletes = await getPublicAthletes({ q: q || undefined });

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-28">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Atletas</p>
      <h1 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Comunidad de atletas</h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-mist">
        Perfiles públicos de los corredores que compiten en las carreras de Stryd Panamá: cuántas carreras llevan, sus
        tiempos oficiales y en qué eventos han participado. Cada atleta decide qué datos comparte.
      </p>

      <form method="get" action="/atletas" role="search" className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="q" className="sr-only">
          Buscar atleta por nombre o apellido
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={80}
          autoComplete="off"
          placeholder="Buscar por nombre o apellido"
          className={`${inputClass} sm:max-w-sm`}
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-full bg-stryd px-7 font-display font-semibold text-black transition-colors hover:bg-stryd-soft active:bg-stryd-deep"
        >
          Buscar
        </button>
        {q && (
          <Link href="/atletas" className="self-center font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
            Ver todos
          </Link>
        )}
      </form>

      {q && (
        <p className="mb-6 font-mono text-xs uppercase tracking-widest text-fog">
          {athletes.length} {athletes.length === 1 ? "coincidencia" : "coincidencias"} para “{q}”
        </p>
      )}

      {athletes.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
          <p className="font-display text-xl text-snow">
            {q ? "No hay atletas con ese nombre" : "Todavía no hay atletas con perfil público"}
          </p>
          <p className="mt-2 text-sm text-mist">
            {q
              ? "Revisa la ortografía o busca solo por apellido."
              : "Cuando los corredores activen su perfil público, aparecerán aquí."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => (
            <Link
              key={athlete.id}
              href={`/atletas/${athlete.id}`}
              className="group flex h-full items-center gap-4 rounded-card border border-hairline bg-carbon p-4 transition hover:border-stryd/50 hover:shadow-glow-soft"
            >
              <AthleteAvatar name={athlete.fullName} photoUrl={athlete.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold text-snow transition-colors group-hover:text-stryd">
                  {athlete.fullName}
                </p>
                <p className="truncate text-sm text-mist">{athlete.country ?? "Panamá"}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-fog">
                  {athlete.totalRaces} {athlete.totalRaces === 1 ? "carrera" : "carreras"}
                </p>
                {athlete.latestRace && (
                  <p className="mt-1 truncate text-xs text-mist">Última: {athlete.latestRace.title}</p>
                )}
              </div>
              <span aria-hidden className="font-mono text-mist transition-transform group-hover:translate-x-1 group-hover:text-stryd">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
