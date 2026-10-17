import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AthleteAvatar } from "@/components/site/AthleteAvatar";
import { Card } from "@/components/ui/Card";
import { getAthleteProfile } from "@/lib/db/queries";
import { athletePhotoUrl, formatDateShortEs, formatFinishTime, instagramUrl } from "@/lib/format";
import { absUrl, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function handleInstagram(raw: string): string {
  return raw
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const athlete = await getAthleteProfile(id);
  if (!athlete) return { title: "Atleta no encontrado", robots: { index: false, follow: false } };

  const carreras = athlete.totalRaces === 1 ? "1 carrera" : `${athlete.totalRaces} carreras`;
  const photo = athletePhotoUrl(athlete.photoUrl);

  return pageMetadata({
    path: `/atletas/${athlete.id}`,
    title: athlete.fullName,
    description:
      athlete.bio?.trim() ||
      `Perfil público de ${athlete.fullName}${athlete.country ? ` (${athlete.country})` : ""}: ${carreras} con Stryd Panamá, tiempos oficiales e historial.`,
    image: photo ? absUrl(photo) : undefined,
    imageAlt: `Foto de ${athlete.fullName}`,
  });
}

export default async function AtletaPage({ params }: Props) {
  const { id } = await params;
  const athlete = await getAthleteProfile(id);
  if (!athlete) notFound();

  const igHref = instagramUrl(athlete.instagram);
  const igHandle = athlete.instagram ? handleInstagram(athlete.instagram) : "";
  const carreras = athlete.totalRaces === 1 ? "1 carrera" : `${athlete.totalRaces} carreras`;

  return (
    <section className="mx-auto max-w-4xl px-5 pb-20 pt-28">
      <Link href="/atletas" className="font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
        ← Atletas
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <AthleteAvatar name={athlete.fullName} photoUrl={athlete.photoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{athlete.fullName}</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-mist">
            {athlete.country ?? "Panamá"} · {carreras}
          </p>
          {igHref && (
            <a
              href={igHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-3 inline-block text-sm font-semibold text-stryd hover:text-stryd-soft"
            >
              Instagram · @{igHandle}
            </a>
          )}
        </div>
      </div>

      {athlete.bio && (
        <p className="mt-8 max-w-2xl whitespace-pre-line text-base leading-relaxed text-fog">{athlete.bio}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Carreras</p>
          <p className="mt-2 font-display text-3xl font-bold">{athlete.totalRaces}</p>
          <p className="mt-1 text-sm text-fog">Con inscripción confirmada</p>
        </Card>
        {athlete.history[0] && (
          <Card className="p-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Última carrera</p>
            <p className="mt-2 truncate font-display text-lg font-bold">{athlete.history[0].raceTitle}</p>
            <p className="mt-1 text-sm text-fog">{formatDateShortEs(athlete.history[0].date)}</p>
          </Card>
        )}
      </div>

      <h2 className="mt-12 mb-4 font-display text-2xl font-bold tracking-tight">Historial de carreras</h2>

      {athlete.history.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-carbon p-10 text-center">
          <p className="font-display text-xl text-snow">Aún no tiene carreras registradas.</p>
          <p className="mt-2 text-sm text-mist">Cuando corra su primera carrera con Stryd Panamá, el resultado aparece aquí.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Historial de carreras de {athlete.fullName}</caption>
            <thead className="bg-carbon font-mono text-xs uppercase tracking-wider text-mist">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Carrera
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Fecha
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Distancia
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Dorsal
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Tiempo
                </th>
              </tr>
            </thead>
            <tbody>
              {athlete.history.map((entry) => (
                <tr key={`${entry.raceSlug}-${entry.date}`} className="border-t border-hairline">
                  <td className="px-5 py-3.5">
                    <Link href={`/carrera/${entry.raceSlug}`} className="font-semibold text-snow hover:text-stryd">
                      {entry.raceTitle}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-mist">{formatDateShortEs(entry.date)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-fog">{entry.distance ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-fog">{entry.bibNumber ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-snow">
                    {formatFinishTime(entry.finishTimeSec)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
