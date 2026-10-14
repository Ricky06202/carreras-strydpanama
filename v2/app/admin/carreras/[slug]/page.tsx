import { notFound } from "next/navigation";
import { getRaceAdmin, type RaceAdminError } from "@/lib/admin/races";
import { requireAdminPage } from "@/lib/admin/page";
import { RaceEditor, type RaceEditable } from "@/components/admin/RaceEditor";
import { CuposBoard } from "@/components/admin/CuposBoard";
import { listTicketsForRace } from "@/lib/cnft/issue";
import { cnftConfig } from "@/lib/cnft/config";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminRaceEditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminPage();
  const { slug } = await params;
  let data: Awaited<ReturnType<typeof getRaceAdmin>>;
  try {
    data = await getRaceAdmin(slug);
  } catch (e) {
    if ((e as RaceAdminError)?.status === 404) notFound();
    throw e;
  }

  const race: RaceEditable = {
    id: data.race.id,
    slug: data.race.slug,
    title: data.race.title,
    description: data.race.description ?? "",
    date: data.race.date,
    startTime: data.race.startTime ?? "",
    location: data.race.location ?? "",
    price: data.race.price,
    platformFee: data.race.platformFee,
    maxParticipants: data.race.maxParticipants,
    startingBib: data.race.startingBib,
    status: data.race.status,
    showTimer: data.race.showTimer,
    showShirtSize: data.race.showShirtSize,
    teamEnabled: data.race.teamEnabled,
    padrinoEnabled: data.race.padrinoEnabled,
  };

  // Cupos digitales (cNFT): estado real de lo emitido + reintento desde el panel.
  const [tickets, cfg] = await Promise.all([
    listTicketsForRace(getDb(), data.race.id).catch(() => []),
    Promise.resolve(cnftConfig()),
  ]);

  return (
    <>
      <RaceEditor
        race={race}
        distances={data.distances.map((d) => ({ id: d.id, title: d.title, kilometers: d.kilometers, price: d.price }))}
        categories={data.categories.map((c) => ({ id: c.id, title: c.title, minAge: c.minAge, maxAge: c.maxAge, gender: c.gender }))}
      />
      <section className="mx-auto w-full max-w-4xl px-4 pb-24">
        <CuposBoard
          raceId={data.race.id}
          tickets={tickets}
          config={{ enabled: cfg.enabled, mode: cfg.mode, network: cfg.network, reasons: cfg.reasons }}
        />
      </section>
    </>
  );
}
