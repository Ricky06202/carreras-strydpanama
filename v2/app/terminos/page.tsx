import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TERMS_SECTIONS, TERMS_UPDATED_LABEL, TERMS_VERSION } from "@/lib/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de las carreras y la plataforma Stryd Panama.",
};

const SECTIONS = TERMS_SECTIONS;

export default function TerminosPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Legal</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-mist">
        Carreras y plataforma de registro de Stryd Panama. Última actualización: {TERMS_UPDATED_LABEL} (versión {TERMS_VERSION}).
      </p>
      <p className="mt-1 text-sm text-mist">
        Complemento obligatorio de estos términos: el{" "}
        <Link href="/privacidad" className="text-stryd underline underline-offset-2">
          Aviso de Privacidad
        </Link>
        .
      </p>

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
        <Button asChild size="lg" variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
        <p className="mt-3 text-xs text-mist">
          La aceptación de estos términos queda registrada con fecha, versión y huella digital del texto al inscribirse.
        </p>
      </div>
    </section>
  );
}
