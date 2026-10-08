import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getRunner } from "@/lib/auth/session";
import { formatDateEs } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PortalActions, RegistrationCard } from "@/components/account/PortalBits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mi portal", robots: { index: false, follow: false } };

const STATUS_UI: Record<string, { label: string; tone: "success" | "stryd" | "danger" }> = {
  preinscrito: { label: "Preinscrito", tone: "stryd" },
  inscrito: { label: "Inscrito", tone: "success" },
  anulado: { label: "Anulado", tone: "danger" },
};

export default async function PortalPage() {
  const runner = await getRunner();
  if (!runner) redirect("/entrar");

  const db = getDb();
  const rows = await db
    .select({
      id: schema.registrations.id,
      title: schema.registrations.title,
      firstName: schema.registrations.firstName,
      lastName: schema.registrations.lastName,
      confirmationCode: schema.registrations.confirmationCode,
      status: schema.registrations.status,
      paymentStatus: schema.registrations.paymentStatus,
      bibNumber: schema.registrations.bibNumber,
      amountPaid: schema.registrations.amountPaid,
      phone: schema.registrations.phone,
      shirtSize: schema.registrations.shirtSize,
      teamName: schema.registrations.teamName,
      createdAt: schema.registrations.createdAt,
      raceSlug: schema.races.slug,
      raceTitle: schema.races.title,
      raceDate: schema.races.date,
      raceStatus: schema.races.status,
      distanceTitle: schema.raceDistances.title,
      categoryTitle: schema.raceCategories.title,
    })
    .from(schema.registrations)
    .innerJoin(schema.races, eq(schema.races.id, schema.registrations.raceId))
    .leftJoin(schema.raceDistances, eq(schema.raceDistances.id, schema.registrations.distanceId))
    .leftJoin(schema.raceCategories, eq(schema.raceCategories.id, schema.registrations.categoryId))
    .where(or(eq(schema.registrations.runnerId, runner.id), eq(schema.registrations.email, runner.email)))
    .orderBy(desc(schema.registrations.createdAt))
    .all();

  return (
    <section className="bg-void min-h-dvh px-4 pb-20 pt-24">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-snow">Hola, {runner.firstName} 👋🏽</h1>
            <p className="mt-1 text-sm text-mist">{runner.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/mi-portal/perfil" className="font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
              Perfil →
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {rows.length === 0 && (
            <Card className="p-8 text-center">
              <p className="font-display text-lg font-semibold text-snow">Aún no tienes inscripciones</p>
              <p className="mt-2 text-sm text-mist">Cuando te inscribas con este correo, aparecerán aquí.</p>
              <Link href="/#carreras" className="mt-4 inline-block font-mono text-xs uppercase tracking-widest text-stryd">
                Ver carreras →
              </Link>
            </Card>
          )}
          {rows.map((r) => (
            <RegistrationCard
              key={r.id}
              data={{
                id: r.id,
                name: r.title,
                raceSlug: r.raceSlug,
                raceTitle: r.raceTitle,
                raceDate: formatDateEs(r.raceDate),
                distanceTitle: r.distanceTitle,
                categoryTitle: r.categoryTitle,
                status: r.status,
                statusUi: STATUS_UI[r.status] ?? { label: r.status, tone: "stryd" },
                paymentStatus: r.paymentStatus,
                bibNumber: r.bibNumber,
                confirmationCode: r.confirmationCode,
                phone: r.phone,
                shirtSize: r.shirtSize,
                teamName: r.teamName,
                raceAccepting: r.raceStatus === "accepting",
              }}
            />
          ))}
        </div>

        <div className="mt-8">
          <PortalActions hasCedula={Boolean(runner.cedula)} />
        </div>
      </div>
    </section>
  );
}
