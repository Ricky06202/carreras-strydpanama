"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import type { AdminCodeItem, CodeStats } from "@/lib/admin/codes";

export type RaceOption = { id: string; title: string; date: string; status: string };

const STATUS_CHIPS = [
  { v: "todos", label: "Todos" },
  { v: "generated", label: "Disponibles" },
  { v: "sold", label: "Vendidos" },
  { v: "redeemed", label: "Usados" },
];
const TONES = { generated: "neutral", sold: "stryd", redeemed: "success" } as const;
const LABELS = { generated: "Disponible", sold: "Vendido", redeemed: "Usado" } as const;
const TYPE_LABELS: Record<string, string> = { all: "Todos", general: "General", estudiante: "Estudiante", team: "Equipo" };

export function CodigosBoard({ races }: { races: RaceOption[] }) {
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  const [status, setStatus] = useState("todos");
  const [items, setItems] = useState<AdminCodeItem[]>([]);
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [qty, setQty] = useState("25");
  const [vendor, setVendor] = useState("");
  const [allowedType, setAllowedType] = useState("all");
  const [generating, setGenerating] = useState(false);

  const [confirm, setConfirm] = useState<{ id: string; code: string } | null>(null);
  const [lastBatch, setLastBatch] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!raceId) return;
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams({ race: raceId });
      if (status !== "todos") sp.set("status", status);
      const res = await fetch(`/api/admin/codigos?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al cargar");
      setItems(data.items);
      setStats(data.stats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [raceId, status]);

  useEffect(() => { void load(); }, [load]);

  async function generate() {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 1 || n > 100) { toast.error("Cantidad debe ser un número entre 1 y 100"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/codigos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, qty: n, vendor: vendor || undefined, allowedType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No se pudo generar");
      setLastBatch(data.created as string[]);
      toast.success(`${data.created.length} códigos generados — listos para copiar`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando códigos");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(text: string, label = "Copiado al portapapeles") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Tu navegador bloqueó el portapapeles");
    }
  }

  const disponibles = items.filter((i) => i.status !== "redeemed");

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mist">Carrera</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)} className="h-11 w-full rounded-xl border border-hairline bg-carbon px-3 text-snow outline-none focus:border-stryd/60">
            {races.map((r) => <option key={r.id} value={r.id}>{r.title} — {r.date.slice(0, 10)}</option>)}
          </select>
        </label>
      </div>

      {/* Generador */}
      <Card className="mt-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Generación masiva</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-mist">Cantidad (1-100)</span>
            <div className="flex gap-1.5">
              <input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" className="h-10 w-full min-w-0 rounded-lg border border-hairline bg-abyss px-3 font-mono text-snow outline-none focus:border-stryd/60" />
            </div>
            <div className="mt-1.5 flex gap-1">
              {[10, 25, 50, 100].map((n) => (
                <button key={n} type="button" onClick={() => setQty(String(n))} className={`rounded-full px-2.5 py-1 text-xs transition ${qty === String(n) ? "bg-stryd font-semibold text-black" : "bg-abyss text-mist hover:text-snow"}`}>{n}</button>
              ))}
            </div>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-mist">Vendor (opcional)</span>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nombre del vendedor" className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-mist">Tipo permitido</span>
            <select value={allowedType} onChange={(e) => setAllowedType(e.target.value)} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <Button disabled={generating || !raceId} onClick={() => void generate()} className="h-10 w-full sm:w-auto">
            {generating ? "Generando…" : "Generar"}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {lastBatch.length > 0 && (
            <motion.div key={lastBatch.join()} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 rounded-xl border border-stryd/30 bg-stryd-dim p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-stryd">Último lote ({lastBatch.length})</p>
                  <Button size="sm" variant="outline" onClick={() => void copy(lastBatch.join("\n"), `${lastBatch.length} códigos copiados`)}>Copiar todos</Button>
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto font-mono text-sm text-snow">
                  {lastBatch.map((c) => <div key={c}>{c}</div>)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Stats + filtros */}
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Disponibles" value={stats.generated} tone="text-snow" />
          <MiniStat label="Vendidos" value={stats.sold} tone="text-stryd" />
          <MiniStat label="Usados" value={stats.redeemed} tone="text-emerald-400" />
        </div>
      )}

      <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
        {STATUS_CHIPS.map((c) => (
          <button key={c.v} type="button" onClick={() => setStatus(c.v)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${status === c.v ? "bg-stryd font-semibold text-black" : "bg-carbon text-fog ring-1 ring-inset ring-hairline hover:text-snow"}`}>
            {c.label}
          </button>
        ))}
        {disponibles.length > 0 && (
          <button type="button" onClick={() => void copy(disponibles.map((d) => d.code).join("\n"), "Disponibles copiados")} className="ml-auto shrink-0 rounded-full px-4 py-2 text-sm text-mist underline-offset-2 hover:text-snow hover:underline">
            Copiar disponibles
          </button>
        )}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-mist">
        {loading ? "Cargando…" : `${items.length} códigos${items.length === 200 ? "+ (mostrando 200)" : ""}`}
      </p>

      {err && (
        <Card className="mt-3 flex items-center justify-between p-4">
          <p className="text-sm text-red-400">{err}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>Reintentar</Button>
        </Card>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card border border-hairline bg-carbon" />)}
        {!loading && items.length === 0 && !err && (
          <Card className="p-8 text-center">
            <p className="font-display text-snow">Sin códigos por aquí</p>
            <p className="mt-1 text-sm text-mist">Genera un lote arriba o cambia el filtro.</p>
          </Card>
        )}
        {!loading && items.map((item) => (
          <Card key={item.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => void copy(item.code, `${item.code} copiado`)} className="group flex items-center gap-2 text-left">
                <span className="font-mono text-[15px] font-semibold tracking-wider text-snow group-hover:text-stryd">{item.code}</span>
                <svg className="h-4 w-4 text-mist transition group-hover:text-stryd" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="5" y="2" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M11 5H2.5A1.5 1.5 0 0 0 1 6.5V13a1.5 1.5 0 0 0 1.5 1.5H9" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <p className="mt-0.5 truncate text-xs text-mist">
                {item.vendor ? `${item.vendor} · ` : ""}{TYPE_LABELS[item.allowedType] ?? item.allowedType}
                {item.redeemedByCedula ? ` · canjeó ${item.redeemedByCedula}` : ""}
              </p>
            </div>
            <Badge tone={TONES[item.status] ?? "neutral"}>{LABELS[item.status] ?? item.status}</Badge>
            {item.status !== "redeemed" && (
              <button type="button" aria-label={`Eliminar ${item.code}`} onClick={() => setConfirm({ id: item.id, code: item.code })} className="shrink-0 rounded-lg p-2 text-mist transition hover:bg-red-950/50 hover:text-red-400">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5.5 4V2.5A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.5 1.5V4m2 0v9A1.5 1.5 0 0 1 11 14.5H5A1.5 1.5 0 0 1 3.5 13V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            )}
          </Card>
        ))}
      </div>

      <ConfirmSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Eliminar código"
        description={<>Se borrará <span className="font-mono text-snow">{confirm?.code}</span> permanentemente. Esta acción es irreversible.</>}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (!confirm) return;
          const res = await fetch(`/api/admin/codigos/${confirm.id}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
          toast.success((data.message as string) ?? "Código eliminado");
          await load();
        }}
      />
    </section>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mist">{label}</p>
      <p className={`font-display mt-0.5 text-lg font-extrabold ${tone}`}>{value}</p>
    </Card>
  );
}
