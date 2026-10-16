import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getRunner } from "@/lib/auth/session";
import { urlEntrarRsId, rsidListo } from "@/lib/rsid";
import { AuthForm } from "@/components/account/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

const MENSAJES: Record<string, string> = {
  no_configurado: "El inicio con RS ID no está disponible ahora. Entra con tu correo.",
  sin_codigo: "El enlace llegó incompleto. Intenta de nuevo desde el RS ID.",
  canje_fallido: "No pudimos validar tu RS ID. Intenta de nuevo o entra con tu correo.",
  demasiados_intentos: "Demasiados intentos seguidos. Espera unos minutos.",
};

type Params = { [k: string]: string | string[] | undefined };
const uno = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) || "";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (await getRunner()) redirect("/mi-portal");

  const sp = await searchParams;
  const rsidError = uno(sp.rsid_error);
  const aviso = MENSAJES[rsidError] || null;
  const altaPorRsId = uno(sp.rsid_alta) === "1";
  const emailRsId = uno(sp.email).trim().toLowerCase();
  const volver = uno(sp.volver);

  // La URL de vuelta debe ser el origen REAL de la petición (dev/staging/prod):
  // el RS ID solo acepta dominios en su lista blanca.
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "carreras.strydpanama.com";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  const volverUrl = `${proto}://${host}/api/auth/canjear${volver ? "?volver=" + encodeURIComponent(volver) : ""}`;
  const rsidHref = rsidListo() ? urlEntrarRsId(volverUrl) : null;

  return (
    <section className="bg-void min-h-dvh px-4 pb-16 pt-24">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-3xl font-bold text-snow">Mi portal</h1>
        <p className="mt-2 text-sm text-mist">
          Consulta tus inscripciones, dorsales y paga lo que quede pendiente.
        </p>

        {aviso && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-sm text-amber-200">
            {aviso}
          </p>
        )}
        {altaPorRsId && (
          <p className="mt-4 rounded-xl border border-stryd/30 bg-carbon p-3 text-sm text-fog">
            Tu correo <span className="font-semibold text-snow">{emailRsId}</span> quedó verificado
            con tu RS ID. Solo completa tu cédula y tus datos para terminar de crear la cuenta.
          </p>
        )}

        <AuthForm rsidHref={rsidHref} emailInicial={emailRsId} altaPorRsId={altaPorRsId} />
      </div>
    </section>
  );
}
