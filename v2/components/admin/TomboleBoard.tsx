"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import type { RaffleStats, RaffleWinnerItem } from "@/lib/admin/raffle";

export type TomboleRaceOption = { id: string; title: string; date: string };

const POOL_CHIPS = [
  { v: false, label: "Todos los inscritos" },
  { v: true, label: "Solo finishers" },
] as const;

export function TomboleBoard({ races }: { races: TomboleRaceOption[] }) {
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  const [winners, setWinners] = useState<RaffleWinnerItem[]>([]);
  const [stats, setStats] = useState<RaffleStats | null>(null);
  const [justWon, setJustWon] = useState<RaffleWinnerItem | null>(null);
  const [prize, setPrize] = useState("");
  const [finishersOnly, setFinishersOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [remove, setRemove] = useState<RaffleWinnerItem | null>(null);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    if (!raceId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/tombole?race=${raceId}`, { cache: "no-store" });
      const d = (await res.json().catch(() => ({}))) as { winners?: RaffleWinnerItem[]; stats?: RaffleStats; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error cargando la tómbola");
      setWinners(d.winners ?? []);
      setStats(d.stats ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    setJustWon(null);
    void load();
  }, [load]);

  async function draw() {
    setDrawing(true);
    try {
      const res = await fetch("/api/admin/tombole", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, prize: prize.trim() || undefined, finishersOnly }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string; winner?: RaffleWinnerItem };
      if (!res.ok) throw new Error(d.error ?? "No se pudo sortear");
      setJustWon(d.winner ?? null);
      toast.success(d.message ?? "Ganador sorteado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error sorteando");
    } finally {
      setDrawing(false);
    }
  }

  if (races.length === 0) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-28">
        <Card className="mt-6 p-8 text-center">
          <p className="font-display text-snow">Sin carreras todavía</p>
          <p className="mt-1 text-sm text-mist">Crea una carrera para poder sortear premios.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <h1 className="font-display text-xl font-extrabold text-snow">Tómbola</h1>

      <label className="mt-4 block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mist">Carrera</span>
        <select
          value={raceId}
          onChange={(e) => setRaceId(e.target.value)}
          className="h-11 w-full rounded-xl border border-hairline bg-carbon px-3 text-snow outline-none focus:border-stryd/60"
        >
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} — {r.date.slice(0, 10)}
            </option>
          ))}
        </select>
      </label>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Inscritos" value={stats.inscribed} tone="text-snow" />
          <MiniStat label="Finishers" value={stats.finishers} tone="text-emerald-400" />
          <MiniStat label="Premios" value={stats.winners} tone="text-stryd" />
        </div>
      )}

      {/* Sorteo */}
      <Card className="mt-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Sortear ganador</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="min-w-0 text-sm">
            <span className="mb-1 block text-xs text-mist">Premio (opcional)</span>
            <input
              value={prize}
              onChange={(e) => setPrize(e.target.value.slice(0, 60))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !drawing) void draw();
              }}
              placeholder="Ej. Kit del corredor"
              className="h-11 w-full rounded-xl border border-hairline bg-abyss px-4 text-snow placeholder-mist/60 outline-none focus:border-stryd/60"
            />
          </label>
          <Button disabled={drawing || loading} onClick={() => void draw()} className="h-11 w-full sm:w-auto">
            {drawing ? "Girando…" : "🎲 Sortear"}
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          {POOL_CHIPS.map((c) => (
            <button
              key={String(c.v)}
              type="button"
              onClick={() => setFinishersOnly(c.v)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                finishersOnly === c.v ? "bg-stryd font-semibold text-black" : "bg-abyss text-mist ring-1 ring-inset ring-hairline hover:text-snow"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist/80">
          Nadie repite premio dentro de la misma carrera. Sorteo con RNG criptográfico del worker; participante = inscripción confirmada
          (pagada/exenta).
        </p>
      </Card>

      {/* Revelado */}
      {justWon && (
        <motion.div
          key={justWon.id}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.75, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        >
          <Card className="mt-4 border-stryd/40 p-6 text-center shadow-glow">
            <p className="font-mono text-[11px] uppercase tracking-widest text-stryd">¡Ganador!</p>
            <p className="font-display mt-2 text-2xl font-black text-snow">{justWon.name}</p>
            <p className="mt-1 text-sm text-mist">
              {justWon.bib != null ? `Dorsal #${justWon.bib} · ` : ""}
              {justWon.prize}
            </p>
          </Card>
        </motion.div>
      )}

      {err && (
        <Card className="mt-3 flex items-center justify-between p-4">
          <p className="text-sm text-red-400">{err}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {/* Ganadores */}
      <div className="mt-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Ganadores ({winners.length})</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {loading &&
            Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-card border border-hairline bg-carbon" />)}
          {!loading && winners.length === 0 && !err && (
            <Card className="p-6 text-center text-sm text-mist">Aún no hay premios sorteados en esta carrera.</Card>
          )}
          {!loading &&
            winners.map((w, i) => (
              <Card key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-7 shrink-0 text-center font-display text-lg font-black ${w.id === justWon?.id ? "text-stryd" : "text-mist"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-snow">{w.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-mist">
                    {w.bib != null ? `#${w.bib} · ` : ""}
                    {new Date(w.createdAt).toLocaleTimeString("es-PA")}
                  </p>
                </div>
                <Badge tone="stryd">{w.prize}</Badge>
                <button
                  type="button"
                  aria-label={`Quitar ganador ${w.name}`}
                  onClick={() => setRemove(w)}
                  className="shrink-0 rounded-lg p-2 text-mist transition hover:bg-red-950/50 hover:text-red-400"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M2 4h12M5.5 4V2.5A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.5 1.5V4m2 0v9A1.5 1.5 0 0 1 11 14.5H5A1.5 1.5 0 0 1 3.5 13V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </Card>
            ))}
        </div>
      </div>

      <ConfirmSheet
        open={remove !== null}
        onClose={() => setRemove(null)}
        title="Quitar ganador"
        description={
          <>
            <span className="font-mono text-snow">{remove?.name}</span> dejará de constar como ganador de{" "}
            <strong className="text-snow">{remove?.prize}</strong> en esta carrera (queda habilitado para volver a salir sorteado).
          </>
        }
        confirmLabel="Quitar"
        danger
        onConfirm={async () => {
          if (!remove) return;
          const res = await fetch(`/api/admin/tombole/${remove.id}`, { method: "DELETE" });
          const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          if (!res.ok) throw new Error(d.error ?? "No se pudo quitar");
          toast.success(d.message ?? "Ganador retirado");
          setRemove(null);
          if (justWon?.id === remove.id) setJustWon(null);
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
