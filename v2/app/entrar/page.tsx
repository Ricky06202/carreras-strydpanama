import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getRunner } from "@/lib/auth/session";
import { urlEntrarRsId, rsidListo, leerTicketAlta } from "@/lib/rsid";
import { AltaRsIdForm } from "@/components/account/AltaRsIdForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

const MENSAJES: Record<string, string> = {
  no_configurado: "El inicio con RS ID no está disponible ahora. Intenta más tarde.",
  sin_codigo: "El enlace llegó incompleto. Intenta de nuevo desde el RS ID.",
  canje_fallido: "No pudimos validar tu RS ID. Intenta de nuevo desde el RS ID.",
  demasiados_intentos: "Demasiados intentos seguidos. Espera unos minutos.",
};

type Params = { [k: string]: string | string[] | undefined };
const uno = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) || "";

// Unica entrada al portal: RS ID. No hay correo ni contraseña a proposito —
// una sola identidad por corredor = una sola cuenta y una sola wallet,
// asi el cupo digital nunca queda partido entre dos cuentas.
export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (await getRunner()) redirect("/mi-portal");

  const sp = await searchParams;
  const rsidError = uno(sp.rsid_error);
  const aviso = MENSAJES[rsidError] || null;
  const ticket = uno(sp.t);
  const volver = uno(sp.volver);

  // El ticket lo firma /api/auth/canjear con el correo que el RS ID ya verifico.
  const emailTicket = uno(sp.rsid_alta) === "1" ? await leerTicketAlta(ticket) : null;

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

        {emailTicket ? (
          <AltaRsIdForm ticket={ticket} email={emailTicket} />
        ) : (
          <div className="mt-6 rounded-2xl border border-hairline bg-carbon p-6">
            {rsidHref ? (
              <>
                <a
                  href={rsidHref}
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-stryd/40 bg-stryd/10 font-display font-semibold text-snow transition hover:border-stryd/70"
                >
                  <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-stryd text-[13px] font-bold text-black">
                    RS
                  </span>
                  Entrar con RS ID
                </a>
                <p className="mt-4 text-center text-xs text-mist">
                  Tu cuenta de corredor se abre con tu RS ID. No necesitas correo ni contraseña.
                </p>
                <p className="mt-2 text-center text-xs text-mist">
                  ¿Todavía no tienes RS ID? Se crea en el mismo botón, con tu correo.
                </p>
              </>
            ) : (
              <p className="text-sm text-fog">
                El inicio con RS ID no está configurado en este sitio. Escríbenos a la mesa de la carrera.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
