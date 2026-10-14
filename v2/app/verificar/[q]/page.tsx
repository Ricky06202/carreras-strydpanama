import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VerifierForm } from "@/components/cupos/VerifierForm";
import { getDb } from "@/lib/db";
import { verifyCupo, type CupoPublic } from "@/lib/cnft/issue";
import { explorerAddressUrl } from "@/lib/cnft/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ q: string }> }): Promise<Metadata> {
  const { q } = await params;
  return { title: `Verificar ${decodeURIComponent(q).slice(0, 24)}`, robots: { index: false, follow: false } };
}

// Fecha/hora de emisión legible (Panamá, UTC-5 sin DST) en vez del ISO crudo.
function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = new Date(d.getTime() - 5 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.getUTCDate())}/${pad(p.getUTCMonth() + 1)}/${p.getUTCFullYear()} ${pad(p.getUTCHours())}:${pad(p.getUTCMinutes())} (Panamá)`;
}

function Chip({ cupo }: { cupo: CupoPublic }) {
  if (cupo.status === "minted" && !cupo.mock)
    return <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">Verificado en cadena</span>;
  if (cupo.status === "minted")
    return <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">Simulado (sin tesorería)</span>;
  if (cupo.status === "error")
    return <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-400/30">Emisión con error</span>;
  return <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mist ring-1 ring-inset ring-white/15">Pendiente</span>;
}

export default async function VerificarResultadoPage({ params }: { params: Promise<{ q: string }> }) {
  const { q } = await params;
  const query = decodeURIComponent(q);
  const results = await verifyCupo(getDb(), query);
  const network = (results[0]?.network === "mainnet" ? "mainnet" : "devnet") as "devnet" | "mainnet";

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stryd">// Verificador</p>
      <h1 className="font-display mt-3 text-3xl font-black text-snow sm:text-4xl">Resultado</h1>
      <p className="mt-2 break-all text-sm text-mist">
        Consulta: <span className="font-mono text-snow">{query}</span>
      </p>

      <Card className="mt-6 p-5">
        <VerifierForm initial={query} />
      </Card>

      {results.length === 0 ? (
        <Card className="mt-4 border-red-500/30 p-5">
          <p className="font-display text-lg font-bold text-red-300">No encontramos ese cupo</p>
          <p className="mt-1 text-sm text-mist">
            Revisa el id, la dirección o el código. Si el cupo aún no se emitió, el atleta puede verlo en{" "}
            <span className="font-mono text-xs">/mi-cupo/&lt;id&gt;</span>.
          </p>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {results.map((cupo) => (
            <Card key={cupo.registrationId} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-snow">
                    {cupo.athlete} <span className="text-mist">·</span> {cupo.raceTitle}
                  </p>
                  <p className="text-xs text-mist">
                    {cupo.distance ?? "—"} {cupo.category ? `· ${cupo.category}` : ""} · Dorsal{" "}
                    {cupo.bibNumber != null ? `#${cupo.bibNumber}` : "por asignar"} · {cupo.raceDate}
                  </p>
                </div>
                <Chip cupo={cupo} />
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Código</dt>
                  <dd className="font-mono text-snow">{cupo.confirmationCode}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Dueño (wallet)</dt>
                  <dd className="break-all font-mono text-xs text-snow">
                    {cupo.ownerAddress ? (
                      <a className="text-stryd hover:underline" href={explorerAddressUrl(cupo.ownerAddress, network)} target="_blank" rel="noreferrer">
                        {cupo.ownerAddress}
                      </a>
                    ) : (
                      "pendiente"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">cNFT</dt>
                  <dd className="break-all font-mono text-xs text-snow">{cupo.assetId ?? "pendiente"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-mist">Emitido</dt>
                  <dd className="text-snow">{fmtFecha(cupo.mintedAt)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Link href={`/mi-cupo/${cupo.registrationId}`} className="rounded-full bg-stryd px-4 py-2 font-semibold text-black">
                  Ver el cupo
                </Link>
                {cupo.metadataUri && (
                  <a href={cupo.metadataUri} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-snow ring-1 ring-inset ring-hairline hover:text-stryd">
                    Metadata
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
