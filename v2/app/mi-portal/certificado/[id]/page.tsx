import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDb, schema } from "@/lib/db";
import { getRunner } from "@/lib/auth/session";
import { formatDateEs } from "@/lib/format";
import { PrintButton } from "@/components/site/PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Certificado de finalización" };

type Props = { params: Promise<{ id: string }> };

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CertificatePage({ params }: Props) {
  const { id } = await params;
  const runner = await getRunner();
  if (!runner) redirect("/entrar");

  const db = getDb();
  const reg = await db
    .select({
      id: schema.registrations.id,
      title: schema.registrations.title,
      status: schema.registrations.status,
      runnerId: schema.registrations.runnerId,
      email: schema.registrations.email,
      bib: schema.registrations.bibNumber,
      teamName: schema.registrations.teamName,
      finishFallback: schema.registrations.finishTimeSec,
      raceTitle: schema.races.title,
      raceDate: schema.races.date,
      distanceTitle: schema.raceDistances.title,
      categoryTitle: schema.raceCategories.title,
      timeSec: schema.results.finishTimeSec,
      pos: schema.results.overallPosition,
      catPos: schema.results.categoryPosition,
    })
    .from(schema.registrations)
    .innerJoin(schema.races, eq(schema.races.id, schema.registrations.raceId))
    .leftJoin(schema.raceDistances, eq(schema.registrations.distanceId, schema.raceDistances.id))
    .leftJoin(schema.raceCategories, eq(schema.registrations.categoryId, schema.raceCategories.id))
    .leftJoin(schema.results, eq(schema.results.registrationId, schema.registrations.id))
    .where(eq(schema.registrations.id, id))
    .get();

  if (!reg || (reg.runnerId !== runner.id && reg.email !== runner.email)) notFound();

  // Sin certificado si la inscripción no está confirmada.
  if (reg.status !== "inscrito") {
    return (
      <section className="bg-void min-h-dvh px-4 pb-20 pt-24">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-display text-2xl font-bold text-snow">Certificado no disponible</p>
          <p className="mt-2 text-sm text-mist">Tu inscripción en {reg.raceTitle} aún no está confirmada. El certificado se emite al consolidarse el pago.</p>
          <Link href="/mi-portal" className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-stryd">
            ← Volver a mi portal
          </Link>
        </div>
      </section>
    );
  }

  const timeSec = reg.timeSec ?? reg.finishFallback;

  return (
    <section className="bg-void min-h-dvh px-4 pb-20 pt-24">
      {/* CSS de impresión: hoja A4 horizontal, sin chrome del sitio */}
      <style dangerouslySetInnerHTML={{ __html: "@page{size:A4 landscape;margin:0}@media print{header,footer{display:none!important}}" }} />

      <div className="mx-auto w-full max-w-3xl print:max-w-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/mi-portal" className="font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
            ← Mi portal
          </Link>
          <PrintButton />
        </div>

        {/* Hoja del certificado (papel blanco, legible al imprimir) */}
        <div className="overflow-hidden rounded-card border-4 border-stryd bg-white text-[#0A0A0B]">
          <div className="border-b border-[#e4e4e6] px-10 py-6 text-center">
            <p className="font-display text-lg font-black tracking-[0.35em] text-[#0A0A0B]">
              STRYD <span className="text-stryd">PANAMÁ</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.4em] text-[#6b6b70]">Carreras pedestres · Certificado de finalización</p>
          </div>

          <div className="px-10 py-8 text-center sm:px-14">
            {timeSec == null ? (
              <>
                <p className="font-display text-2xl font-black">{reg.title}</p>
                <p className="mt-2 text-sm text-[#3c3c41]">
                  Inscripción confirmada en <strong>{reg.raceTitle}</strong> ({formatDateEs(reg.raceDate)})
                </p>
                <p className="mt-6 rounded-xl border border-[#ffd0ac] bg-[#fff4ec] px-4 py-3 text-sm text-[#a34a00]">
                  Tu tiempo aún no está consolidado. El certificado con tiempo se publica cuando el equipo termina el cronometraje — vuelve pronto.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#6b6b70]">Se certifica que</p>
                <p className="font-display mt-3 text-4xl font-black tracking-tight">{reg.title}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-[#3c3c41]">
                  completó la <strong className="text-[#0A0A0B]">{reg.raceTitle}</strong>
                  <br />
                  {formatDateEs(reg.raceDate)}
                  {reg.distanceTitle ? ` · Modalidad ${reg.distanceTitle}` : ""}
                  {reg.categoryTitle ? ` · Categoría ${reg.categoryTitle}` : ""}
                </p>

                <div className="mt-7 flex items-end justify-center gap-8 sm:gap-12">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#6b6b70]">Tiempo oficial</p>
                    <p className="font-display mt-1 text-5xl font-black text-stryd">{fmtTime(timeSec)}</p>
                  </div>
                  <div className="pb-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#6b6b70]">Dorsal</p>
                    <p className="font-display mt-1 text-3xl font-black">#{reg.bib ?? "—"}</p>
                  </div>
                </div>

                {(reg.pos != null || reg.catPos != null || reg.teamName) && (
                  <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#3c3c41]">
                    {reg.pos != null && (
                      <span>
                        Puesto <strong className="text-[#0A0A0B]">#{reg.pos}</strong> general
                      </span>
                    )}
                    {reg.catPos != null && (
                      <span>
                        <strong className="text-[#0A0A0B]">#{reg.catPos}</strong> en {reg.categoryTitle ?? "su categoría"}
                      </span>
                    )}
                    {reg.teamName && <span>Equipo {reg.teamName}</span>}
                  </div>
                )}

                <p className="mt-9 border-t border-[#e4e4e6] pt-5 text-[11px] text-[#6b6b70]">
                  Resultado oficial cronometrado por STRYD Panamá · carreras.strydpanama.com · Emitido el {new Date().toLocaleDateString("es-PA")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
