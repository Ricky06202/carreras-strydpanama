import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de las carreras y la plataforma Stryd Panama.",
};

const SECTIONS: { h: string; p: string; bullets?: string[] }[] = [
  {
    h: "1. Aceptación de los Términos",
    p: "Al acceder y utilizar esta plataforma de registro para eventos organizados por Stryd Panama y sus filiales, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte, por favor absténgase de utilizar nuestros servicios de registro de carreras.",
  },
  {
    h: "2. Inscripción y Pagos",
    p: "",
    bullets: [
      "Todas las inscripciones son personales e intransferibles.",
      "El registro no quedará en firme hasta que se haya completado el pago en su totalidad o el estado figure como \"Pagado\" (Válido para pagos mediante Yappy/ACH).",
      "No se realizarán devoluciones o reembolsos bajo ninguna circunstancia, incluyendo enfermedades, lesiones, mudanza de país, o desastres naturales, salvo que el evento sea cancelado por el organizador.",
    ],
  },
  {
    h: "3. Salud y Condición Física",
    p: "Al inscribirse, el participante certifica tener un estado de salud físico óptimo y haber entrenado adecuadamente para completar la carrera en la que se registra. Stryd Panama y los patrocinadores no se hacen responsables por afecciones médicas o emergencias ocurridas durante el evento producto de patologías previas de los corredores.",
  },
  {
    h: "4. Privacidad de Datos",
    p: "La información recopilada mediante el formulario de inscripción se utilizará exclusivamente para fines logísticos de la carrera, generación de Dorsales (BIBs), chips de rastreo en ciertos eventos y contacto directo. No vendemos ni compartimos sus datos con entidades publicitarias de terceros.",
  },
  {
    h: "5. Derechos de Autor y Medios",
    p: "Su inscripción al evento le concede a Stryd Panama los derechos absolutos e irrevocables para grabar, usar y publicar fotografías, videos y audios tomados durante el evento en nuestras redes sociales, páginas web y para propósitos de marketing futuro. Usted renuncia a toda compensación derivada de este material audiovisual.",
  },
  {
    h: "6. Modificaciones de Evento",
    p: "Nos reservamos el derecho de modificar el horario, fecha, y/o las rutas del evento en caso de presentarse situaciones de fuerza mayor que atenten contra la integridad y seguridad de los participantes (por ejemplo: tormentas tropicales extremas, condiciones de rutas caóticas o requerimientos gubernamentales).",
  },
];

export default function TerminosPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Legal</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-mist">Carreras y plataforma de registro de Stryd Panama.</p>

      <div className="mt-8 flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.h} className="p-6">
            <h2 className="font-display text-lg font-bold text-stryd">{s.h}</h2>
            {s.p && <p className="mt-2 text-[15px] leading-relaxed text-fog">{s.p}</p>}
            {s.bullets && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-fog">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button asChild size="lg">
          <Link href="/">Acepto y volver al inicio</Link>
        </Button>
      </div>
    </section>
  );
}
