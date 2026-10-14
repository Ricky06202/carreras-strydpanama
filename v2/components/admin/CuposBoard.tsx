"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { AdminTicketRow } from "@/lib/cnft/issue";

export type CuposConfig = {
  enabled: boolean;
  mode: string;
  network: string;
  reasons: string[];
};

const STATUS_STYLE: Record<string, string> = {
  minted: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  pending: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  error: "bg-red-500/15 text-red-300 ring-red-400/30",
  skipped: "bg-white/10 text-mist ring-white/15",
};

const STATUS_LABEL: Record<string, string> = {
  minted: "Emitido",
  pending: "Pendiente",
  error: "Error",
  skipped: "Omitido",
};

function short(v: string | null | undefined, n = 10): string {
  if (!v) return "—";
  return v.length > n * 2 ? `${v.slice(0, n)}…${v.slice(-4)}` : v;
}

export function CuposBoard({
  raceId,
  tickets: initial,
  config,
}: {
  raceId: string;
  tickets: AdminTicketRow[];
  config: CuposConfig;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicketRow[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const s = { emitidos: 0, simulados: 0, pendientes: 0, errores: 0 };
    for (const t of tickets) {
      if (t.status === "minted" && !t.mock) s.emitidos++;
      else if (t.status === "minted") s.simulados++;
      else if (t.status === "error") s.errores++;
      else s.pendientes++;
    }
    return s;
  }, [tickets]);

  const shown = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  async function refresh() {
    try {
      const res = await fetch(`/api/admin/cupos?race=${encodeURIComponent(raceId)}`, { cache: "no-store" });
      const data = (await res.json()) as { tickets?: AdminTicketRow[] };
      if (Array.isArray(data?.tickets)) setTickets(data.tickets);
      router.refresh();
    } catch {
      toast.error("No se pudo refrescar");
    }
  }

  async function retry(ticket: AdminTicketRow) {
    setBusy(ticket.id);
    try {
      const res = await fetch("/api/admin/cupos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; reason?: string };
      if (data?.status === "minted" || data?.status === "already") {
        toast.success(`Cupo de ${ticket.athlete} emitido ✓`);
      } else {
        toast.error(`Reintento falló: ${data?.reason ?? res.status}`);
      }
      await refresh();
    } catch {
      toast.error("No se pudo reintentar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mt-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Cupos digitales (cNFT)</p>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
              !config.enabled
                ? "bg-white/10 text-mist ring-white/15"
                : config.mode === "live"
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-amber-500/15 text-amber-300 ring-amber-400/30"
            }`}
          >
            {!config.enabled ? "Apagado" : config.mode === "live" ? `En vivo (${config.network})` : `Simulado (${config.network})`}
          </span>
          <Button size="sm" variant="outline" onClick={refresh}>Refrescar</Button>
        </div>
      </div>

      {!config.enabled ? (
        <p className="mt-3 text-xs text-mist">
          La emisión de cupos está <b className="text-snow">apagada</b>. Las inscripciones funcionan igual que siempre.
          Para activarla define <span className="font-mono text-snow">CNFT_RED=devnet</span> y{" "}
          <span className="font-mono text-snow">CNFT_WALLET_KEY</span>.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {[
              ["all", `Todos (${tickets.length})`],
              ["minted", `Emitidos (${stats.emitidos + stats.simulados})`],
              ["error", `Errores (${stats.errores})`],
              ["pending", `Pendientes (${stats.pendientes})`],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1.5 transition ${filter === k ? "bg-stryd font-semibold text-black" : "bg-abyss text-mist ring-1 ring-inset ring-hairline hover:text-snow"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.mode !== "live" && (
            <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Emisión <b>simulada</b>: para emitir de verdad {config.reasons.join("; ") || "falta configurar la tesorería"}.
            </p>
          )}

          <div className="mt-3 overflow-x-auto">
            {shown.length === 0 ? (
              <p className="py-4 text-sm text-mist">Todavía no hay cupos en este estado.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-widest text-mist">
                    <th className="py-2 pr-3">Atleta</th>
                    <th className="py-2 pr-3">Dorsal</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">cNFT</th>
                    <th className="py-2 pr-3">Wallet</th>
                    <th className="py-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.id} className="border-t border-hairline">
                      <td className="py-2 pr-3">
                        <span className="text-snow">{t.athlete}</span>
                        <span className="ml-2 font-mono text-[10px] text-mist">{t.confirmationCode}</span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-mist">{t.bibNumber != null ? `#${t.bibNumber}` : "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLE[t.status] ?? STATUS_STYLE.skipped}`}>
                          {STATUS_LABEL[t.status] ?? t.status}
                          {t.status === "minted" && t.mock ? " (mock)" : ""}
                        </span>
                        {t.lastError && <p className="mt-1 max-w-[200px] text-[10px] text-red-400">{t.lastError}</p>}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-mist" title={t.assetId ?? ""}>{short(t.assetId)}</td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-mist" title={t.ownerAddress ?? ""}>{short(t.ownerAddress)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/mi-cupo/${t.registrationId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full px-3 py-1.5 text-xs text-snow ring-1 ring-inset ring-hairline hover:text-stryd"
                          >
                            Ver
                          </a>
                          <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => retry(t)}>
                            {busy === t.id ? "…" : t.attempts > 0 ? "Reintentar" : "Emitir"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
