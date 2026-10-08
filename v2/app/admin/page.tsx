import Link from "next/link";
import { count, eq, sql as dsql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin/page";
import { formatDateEs } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminPage();
  const db = getDb();

  const [races, regs, preins, pendientes, codes] = await Promise.all([
    db.select({ n: count() }).from(schema.races).get(),
    db.select({ n: count() }).from(schema.registrations).where(eq(schema.registrations.status, "inscrito")).get(),
    db.select({ n: count() }).from(schema.registrations).where(eq(schema.registrations.status, "preinscrito")).get(),
    db.select({ n: count() }).from(schema.payments).where(eq(schema.payments.status, "pending")).get(),
    db.select({ n: count() }).from(schema.registrationCodes).where(dsql`${schema.registrationCodes.usedAt} IS NULL`).get(),
  ]);

  const upcoming = await db
    .select({ id: schema.races.id, slug: schema.races.slug, title: schema.races.title, date: schema.races.date, status: schema.races.status })
    .from(schema.races)
    .orderBy(schema.races.date)
    .limit(6)
    .all();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-snow sm:text-3xl">Resumen</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric k="Carreras" v={races?.n ?? 0} />
        <Metric k="Inscritos" v={regs?.n ?? 0} tone="text-emerald-400" />
        <Metric k="Preinscritos" v={preins?.n ?? 0} tone="text-stryd" />
        <Metric k="Pagos pendientes" v={pendientes?.n ?? 0} tone="text-amber-400" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Carreras próximas</p>
          <div className="mt-4 flex flex-col divide-y divide-hairline">
            {upcoming.map((r) => (
              <Link key={r.id} href={`/admin/carreras/${r.slug}`} className="flex items-center justify-between gap-3 py-3 hover:text-stryd">
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-semibold text-snow">{r.title}</span>
                  <span className="text-xs text-mist">{formatDateEs(r.date)}</span>
                </span>
                <Badge tone="neutral">{r.status}</Badge>
              </Link>
            ))}
            {upcoming.length === 0 && <p className="py-3 text-sm text-mist">Sin carreras.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Acciones rápidas</p>
          <div className="mt-4 flex flex-col gap-2">
            <QuickLink href="/admin/codigos" label="Generar códigos de inscripción" hint={`${codes?.n ?? 0} sin usar`} />
            <QuickLink href="/admin/inscripciones" label="Revisar pagos pendientes" hint="verificar transferencia / efectivo" />
            <QuickLink href="/admin/equipos" label="Aprobar equipos" hint="solicitudes nuevas" />
            <QuickLink href="/admin/timing" label="Cronometrar la carrera" hint="meta, podio y CSV" />
            <QuickLink href="/admin/carreras" label="Crear / editar carrera" hint="modalidades y categorías" />
          </div>
        </Card>
      </div>
    </section>
  );
}

function Metric({ k, v, tone = "text-snow" }: { k: string; v: number; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mist">{k}</p>
      <p className={`font-display mt-1 text-3xl font-black ${tone}`}>{v}</p>
    </Card>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-hairline bg-carbon px-4 py-3 transition hover:border-stryd/50">
      <span className="text-sm font-semibold text-snow">{label}</span>
      <span className="text-xs text-mist">{hint} →</span>
    </Link>
  );
}
