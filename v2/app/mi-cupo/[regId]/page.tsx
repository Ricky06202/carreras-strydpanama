import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { cupoBelongsToRunner, getPublicCupo } from "@/lib/cnft/issue";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/cnft/config";
import { getRunner } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CupoQr } from "@/components/cupos/CupoQr";
import { CupoShare } from "@/components/cupos/CupoShare";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/cupo/og";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const BASE = SITE_URL.replace(/\/+$/, "");

function estadoChip(status: string, mock: boolean): { label: string; cls: string } {
  if (status === "minted" && !mock) return { label: "Verificado en cadena", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" };
  if (status === "minted") return { label: "Simulado (devnet/mock)", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30" };
  if (status === "error") return { label: "Pendiente de reintento", cls: "bg-red-500/15 text-red-300 ring-red-400/30" };
  if (status === "pending") return { label: "Emitiendo…", cls: "bg-sky-500/15 text-sky-300 ring-sky-400/30" };
  return { label: "Cupo no emitido", cls: "bg-white/10 text-mist ring-white/15" };
}

// Head metadata con la tarjeta OG dinámica del cupo (absoluta): lo que ven
// WhatsApp / Instagram / X al compartir el link.
export async function generateMetadata({ params }: { params: Promise<{ regId: string }> }): Promise<Metadata> {
  const { regId } = await params;
  const cupo = await getPublicCupo(getDb(), regId);
  const nombre = cupo.found ? (cupo.athlete ?? "").trim() || "Atleta" : null;
  const title = nombre ? `Cupo de ${nombre}` : "Mi cupo";
  const description = nombre
    ? `${nombre} · ${cupo.raceTitle ?? ""}${cupo.bibNumber != null ? ` · dorsal #${cupo.bibNumber}` : ""}. Cupo digital verificado en la cadena.`
    : "Cupo digital verificado: tu entrada personal, en la cadena.";
  const imageUrl = `${BASE}/mi-cupo/${regId}/og.png`;
  const imageAlt = nombre ? `Cupo digital de ${nombre}` : "Cupo digital verificado en la cadena";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/mi-cupo/${regId}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "es_PA",
      url: `${BASE}/mi-cupo/${regId}`,
      title,
      description,
      images: [{ url: imageUrl, width: OG_WIDTH, height: OG_HEIGHT, alt: imageAlt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function MiCupoPage({ params }: { params: Promise<{ regId: string }> }) {
  const { regId } = await params;
  const db = getDb();
  const cupo = await getPublicCupo(db, regId);
  if (!cupo.found) notFound();

  const runner = await getRunner();
  const esTuyo = await cupoBelongsToRunner(db, cupo.registrationId as string, runner);

  const url = `${BASE}/mi-cupo/${cupo.registrationId}`;
  const chip = estadoChip(cupo.status ?? "pending", cupo.mock ?? true);
  const network = (cupo.network === "mainnet" ? "mainnet" : "devnet") as "devnet" | "mainnet";
  const atleta = (cupo.athlete ?? "Atleta").trim() || "Atleta";

  // Enlace al explorador para el estado "verificado en cadena": la transacción si
  // existe; si no, la cuenta dueña del activo.
  const cadenaUrl = cupo.signature
    ? explorerTxUrl(cupo.signature, network)
    : cupo.ownerAddress
      ? explorerAddressUrl(cupo.ownerAddress, network)
      : null;

  const datos: [string, string][] = [
    ["Atleta", atleta],
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

      {/* Identidad: de quién es este cupo, con prueba on-chain */}
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Este cupo pertenece a</p>
            <h2 className="font-display mt-1 break-words text-2xl font-black text-snow sm:text-3xl">{atleta}</h2>
            <p className="mt-1 text-sm text-mist">
              {cupo.raceTitle ?? "Carrera"}
              {cupo.distance ? ` · ${cupo.distance}` : ""}
              {cupo.category ? ` · ${cupo.category}` : ""}
              {cupo.raceDate ? ` · ${cupo.raceDate}` : ""}
            </p>
          </div>
          {esTuyo && (
            <Badge tone="success" className="shrink-0">
              Este cupo es tuyo
            </Badge>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Dorsal</dt>
            <dd className="mt-0.5 text-sm text-snow">{cupo.bibNumber != null ? `#${cupo.bibNumber}` : "por asignar"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Carrera</dt>
            <dd className="mt-0.5 truncate text-sm text-snow">{cupo.raceTitle ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Fecha</dt>
            <dd className="mt-0.5 text-sm text-snow">{cupo.raceDate ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-hairline pt-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-mist">Dueño del activo (wallet):</span>
              {cupo.ownerAddress ? (
                <a
                  className="break-all font-mono text-xs text-stryd hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stryd"
                  href={explorerAddressUrl(cupo.ownerAddress, network)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {cupo.ownerAddress}
                </a>
              ) : (
                <span className="text-mist">pendiente</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-mist">Estado:</span>
              {cadenaUrl ? (
                <a
                  href={cadenaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stryd ${chip.cls}`}
                >
                  {chip.label}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only">— ver en el explorador de Solana ({network})</span>
                </a>
              ) : (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${chip.cls}`}>{chip.label}</span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-widest text-mist">{network}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-mist">
            Por qué esto prueba que es tuyo: el cupo vive en <b className="text-snow">una cuenta única</b> que corresponde a esta
            persona y se verifica en la cadena — una captura de pantalla no vale como duplicado.
          </p>
          {esTuyo && (
            <div className="mt-4">
              <CupoShare url={url} nombre={atleta} />
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-4 p-5">
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
