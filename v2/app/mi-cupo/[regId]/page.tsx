import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getPublicCupo } from "@/lib/cnft/issue";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/cnft/config";
import { Card } from "@/components/ui/Card";
import { CupoQr } from "@/components/cupos/CupoQr";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cupo",
  description: "Cupo digital verificado: tu entrada personal, en la cadena.",
  robots: { index: false, follow: false },
};

function estadoChip(status: string, mock: boolean): { label: string; cls: string } {
  if (status === "minted" && !mock) return { label: "Verificado en cadena", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" };
  if (status === "minted") return { label: "Simulado (devnet/mock)", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30" };
  if (status === "error") return { label: "Pendiente de reintento", cls: "bg-red-500/15 text-red-300 ring-red-400/30" };
  if (status === "pending") return { label: "Emitiendo…", cls: "bg-sky-500/15 text-sky-300 ring-sky-400/30" };
  return { label: "Cupo no emitido", cls: "bg-white/10 text-mist ring-white/15" };
}

export default async function MiCupoPage({ params }: { params: Promise<{ regId: string }> }) {
  const { regId } = await params;
  const cupo = await getPublicCupo(getDb(), regId);
  if (!cupo.found) notFound();

  const url = `${SITE_URL.replace(/\/+$/, "")}/mi-cupo/${cupo.registrationId}`;
  const chip = estadoChip(cupo.status ?? "pending", cupo.mock ?? true);
  const network = (cupo.network === "mainnet" ? "mainnet" : "devnet") as "devnet" | "mainnet";

  const datos: [string, string][] = [
    ["Atleta", cupo.athlete ?? "—"],
    ["Carrera", cupo.raceTitle ?? "—"],
    ["Fecha", cupo.raceDate ?? "—"],
  ];
  if (cupo.distance) datos.push(["Modalidad", cupo.distance]);
  if (cupo.category) datos.push(["Categoría", cupo.category]);
  datos.push(["Dorsal", cupo.bibNumber != null ? `#${cupo.bibNumber}` : "por asignar"]);
  datos.push(["Código", cupo.confirmationCode ?? "—"]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Cupo digital</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">Mi cupo</h1>
      <p className="mt-2 text-sm text-mist">
        Tu entrada personal. No es una imagen: vive en la cadena y cualquiera puede verificarla.
      </p>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0">
            <CupoQr value={url} size={220} />
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-mist">Escanea para verificar</p>
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${chip.cls}`}>{chip.label}</span>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">{k}</dt>
                  <dd className="mt-0.5 truncate text-sm text-snow">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-mist">
              Este cupo es <b className="text-snow">personal y no transferible</b>: una captura de pantalla no sirve como
              duplicado porque el registro real vive en la cadena con un dueño único.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Cadena ({network})</p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div>
            <span className="text-mist">Wallet del dueño: </span>
            {cupo.ownerAddress ? (
              <a className="break-all font-mono text-xs text-stryd hover:underline" href={explorerAddressUrl(cupo.ownerAddress, network)} target="_blank" rel="noreferrer">
                {cupo.ownerAddress}
              </a>
            ) : (
              <span className="text-mist">pendiente</span>
            )}
          </div>
          <div>
            <span className="text-mist">cNFT: </span>
            {cupo.assetId ? (
              <span className="break-all font-mono text-xs text-snow">{cupo.assetId}</span>
            ) : (
              <span className="text-mist">pendiente</span>
            )}
          </div>
          {cupo.signature && (
            <div>
              <span className="text-mist">Transacción: </span>
              <a className="break-all font-mono text-xs text-stryd hover:underline" href={explorerTxUrl(cupo.signature, network)} target="_blank" rel="noreferrer">
                {cupo.signature}
              </a>
            </div>
          )}
          {cupo.metadataUri && (
            <div>
              <span className="text-mist">Metadata: </span>
              <a className="break-all font-mono text-xs text-stryd hover:underline" href={cupo.metadataUri} target="_blank" rel="noreferrer">
                {cupo.metadataUri}
              </a>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href={`/verificar/${cupo.registrationId}`} className="rounded-full bg-stryd px-4 py-2 font-semibold text-black">
            Verificar este cupo
          </Link>
          {cupo.raceSlug && (
            <Link href={`/carrera/${cupo.raceSlug}`} className="rounded-full px-4 py-2 text-snow ring-1 ring-inset ring-hairline hover:text-stryd">
              Ver la carrera
            </Link>
          )}
        </div>
      </Card>

      <p className="mt-6 text-center text-[11px] text-mist">
        Cupo emitido con la tecnología de <a className="text-stryd hover:underline" href="https://rsanjur.com" target="_blank" rel="noreferrer">rsanjur.com</a>
      </p>
    </section>
  );
}
