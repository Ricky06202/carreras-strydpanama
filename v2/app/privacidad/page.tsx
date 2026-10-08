import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED_LABEL } from "@/lib/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description:
    "Aviso de privacidad de la plataforma de inscripciones Stryd Panama, conforme a la Ley 81 de 2019 de Protección de Datos Personales.",
};

export default function PrivacidadPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Legal</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">Aviso de Privacidad</h1>
      <p className="mt-2 text-sm text-mist">
        Plataforma de inscripciones de Stryd Panama. Conforme a la Ley 81 de 2019 de Protección de Datos
        Personales de la República de Panamá. Última actualización: {PRIVACY_UPDATED_LABEL}.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {PRIVACY_SECTIONS.map((s) => (
          <Card key={s.h} className="p-6">
            <h2 className="font-display text-lg font-bold text-stryd">{s.h}</h2>
            {s.p && <p className="mt-2 text-[15px] leading-relaxed text-fog">{s.p}</p>}
            {s.bullets && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-fog">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-hairline bg-abyss p-5 text-sm leading-relaxed text-mist">
        <p>
          <span className="font-semibold text-snow">Ejercicio de derechos y contacto:</span>{" "}
          carreras@strydpanama.com — indique en el asunto «Datos personales» y envía desde el correo
          registrado en tu inscripción. Consulta también los{" "}
          <Link href="/terminos" className="text-stryd underline underline-offset-2">
            Términos y Condiciones
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
