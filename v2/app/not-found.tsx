import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Error 404</p>
      <h1 className="mt-4 font-display text-5xl font-black tracking-tight text-snow sm:text-6xl">
        Meta no encontrada
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
        La página que buscas no existe o cambió de ruta. Vuelve al calendario de carreras o consulta los
        resultados oficiales.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/carreras">Ver carreras</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/resultados">Resultados</Link>
        </Button>
      </div>
    </section>
  );
}
