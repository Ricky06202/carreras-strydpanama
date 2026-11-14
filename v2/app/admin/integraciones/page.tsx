import { env } from "cloudflare:workers";
import { requireAdminPage } from "@/lib/admin/page";
import { getAdminEmail } from "@/lib/admin/session";
import { connectedClients } from "@/lib/mcp-server";
import { Card } from "@/components/ui/Card";
export const dynamic = "force-dynamic";

export default async function Integraciones() {
  await requireAdminPage();
  const email = await getAdminEmail();
  const active = email ? await connectedClients(env.DB, email) : 0;
  const url = String((env as unknown as Record<string, unknown>).CARRERAS_CHATGPT_PLUGIN_URL || "");
  const published = /^https:\/\/chatgpt\.com\/plugins(?:\/|$)/.test(url);
  return <section className="mx-auto w-full max-w-4xl px-4 py-8 text-snow">
    <p className="font-mono text-xs uppercase tracking-widest text-stryd">Integraciones de IA</p>
    <h1 className="font-display mt-2 text-3xl font-black">Conecta tu ChatGPT</h1>
    <p className="mt-3 text-mist">Consulta carreras y resúmenes de inscripciones desde ChatGPT o Claude. No puede modificar resultados, pagos ni registros.</p>
    <Card className="mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">ChatGPT</h2>
          <p className="mt-1 text-sm text-mist">{active ? "Hay autorizaciones MCP vigentes" : "Sin autorizaciones vigentes"}</p>
        </div>
        <a className="inline-flex min-h-11 items-center rounded-xl bg-stryd px-5 py-3 font-bold text-abyss hover:brightness-110"
           href={published ? url : "https://chatgpt.com/plugins"} target="_blank" rel="noopener noreferrer">
          Agregar ChatGPT ↗
        </a>
      </div>
      <p className="mt-4 text-sm text-mist">{published
        ? "Instala el complemento y confirma el acceso a Carreras."
        : "Todavía no se ha publicado el complemento. Se abrirá el directorio, sin conectar tu cuenta automáticamente."}</p>
      <p className="mt-3 break-all font-mono text-xs text-mist">Servidor MCP: https://carreras.strydpanama.com/mcp</p>
      <p className="mt-2 text-xs text-mist">La autorización no garantiza que ChatGPT tenga instalado el complemento.</p>
      {!email && <p className="mt-3 text-sm text-amber-300">Vuelve a iniciar sesión en el panel para asociar la conexión a tu correo.</p>}
      {email && active > 0 && <form action="/api/admin/integraciones/revocar" method="post" className="mt-5">
        <button type="submit" className="min-h-11 rounded-xl border border-red-400/40 px-4 text-sm text-red-200 hover:bg-red-400/10">Revocar mis conexiones</button>
      </form>}
    </Card>
  </section>;
}
