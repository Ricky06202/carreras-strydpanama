import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { VerifierForm } from "@/components/cupos/VerifierForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/verificar",
  title: "Verificar un cupo",
  description:
    "Verifica un cupo digital de carrera: pega el id del cupo, la dirección del cNFT, la firma de la transacción o el código de confirmación y comprueba quién es el dueño.",
});

export default function VerificarPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Verificador</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">
        ¿Es real este cupo?
      </h1>
      <p className="mt-2 text-sm text-mist">
        Un cupo vive en la cadena con un dueño único. Pega el <b className="text-snow">id del cupo</b>, la{" "}
        <b className="text-snow">dirección del cNFT</b>, la <b className="text-snow">firma</b> de la transacción o el{" "}
        <b className="text-snow">código de confirmación</b> y te decimos si existe, de quién es y su historial.
      </p>

      <Card className="mt-6 p-5">
        <VerifierForm />
        <p className="mt-3 text-xs text-mist">
          Una captura de pantalla se puede copiar; el cupo no: su registro queda en la cadena y su dueño es único.
        </p>
      </Card>

      <Card className="mt-4 p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Cómo lo usan en la puerta</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-snow">
          <li>El atleta muestra su QR (en <span className="font-mono text-xs">/mi-cupo/&lt;id&gt;</span>).</li>
          <li>Escaneas y llegas a esta página con el id ya resuelto.</li>
          <li>Si el estado dice «Verificado en cadena», el cupo es auténtico y ya fue validado una vez.</li>
        </ol>
      </Card>
    </section>
  );
}
