"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import type { AdminResultRow, AdminTimingEventItem, AdminTimingStats, AdminTimerInfo, Checkpoint } from "@/lib/admin/timing";

export type TimingRaceOption = { id: string; title: string; date: string; status: string; timerStartMs: number | null; timerStopMs: number | null };

const inputCls =
  "h-14 w-full rounded-xl border border-hairline bg-abyss px-4 font-mono text-2xl text-snow placeholder-mist/40 outline-none transition focus:border-stryd/60 focus:shadow-glow-soft";

function fmtSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Agrupa dígitos desde la derecha: 5211 → 52:11 · 105211 → 10:52:11 · 10521 → 1:05:21 */
function timeGroup(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 6);
  if (!d) return "";
  const s = d.slice(-2);
  const m = d.slice(-4, -2);
  const h = d.slice(0, -4);
  if (!m) return d.length <= 2 ? d : `${h}:${s}`;
  return `${h ? `${h}:` : ""}${m}:${s}`;
}

export function TimingBoard({ races }: { races: TimingRaceOption[] }) {
  const initialRace = races.find((r) => r.status === "active") ?? races[0];
  const [raceId, setRaceId] = useState(initialRace?.id ?? "");
  const [raceInfo, setRaceInfo] = useState<AdminTimerInfo | null>(null);
  const [bib, setBib] = useState("");
  const [time, setTime] = useState("");
  const [manualTime, setManualTime] = useState(false);
  const [checkpoint, setCheckpoint] = useState<Checkpoint>("finish");
  const [events, setEvents] = useState<AdminTimingEventItem[]>([]);
  const [stats, setStats] = useState<AdminTimingStats | null>(null);
  const [rows, setRows] = useState<AdminResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timerBusy, setTimerBusy] = useState(false);
  const [computing, setComputing] = useState(false);
  const [undo, setUndo] = useState<AdminTimingEventItem | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [filter, setFilter] = useState("");
  const bibRef = useRef<HTMLInputElement | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const timerRunning = raceInfo?.timerStartMs != null && raceInfo?.timerStopMs == null;
  const timerStopped = raceInfo?.timerStartMs != null && raceInfo?.timerStopMs != null;
  const autoAvailable = !!timerRunning;
  const showTimeField = manualTime || !autoAvailable;

  // Cronómetro vivo (solo display local; la captura la hace el server con su reloj).
  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  const load = useCallback(async () => {
    if (!raceId) return;
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams({ race: raceId });
      const [tRes, rRes] = await Promise.all([
        fetch(`/api/admin/timing?${sp.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/timing/results?${sp.toString()}`, { cache: "no-store" }),
      ]);
      const t = (await tRes.json().catch(() => ({}))) as {
        events?: AdminTimingEventItem[];
        stats?: AdminTimingStats;
        race?: AdminTimerInfo;
        error?: string;
      };
      const r = (await rRes.json().catch(() => ({}))) as { rows?: AdminResultRow[] };
      if (!tRes.ok) throw new Error(t.error ?? "Error cargando cronometraje");
      setEvents(t.events ?? []);
      setStats(t.stats ?? null);
      setRaceInfo(t.race ?? null);
      setRows(r.rows ?? []);
      setManualTime(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    void load();
    bibRef.current?.focus();
  }, [load]);

  async function timerAction(action: "start" | "stop" | "reset") {
    setTimerBusy(true);
    try {
      const res = await fetch("/api/admin/timing/timer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, action }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo controlar el cronómetro");
      toast.success(d.message ?? "Listo");
      setNowTick(Date.now());
      await load();
      bibRef.current?.focus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error controlando cronómetro");
    } finally {
      setTimerBusy(false);
    }
  }

  async function record(e: React.FormEvent) {
    e.preventDefault();
    if (!bib) {
      toast.error("Pon el dorsal");
      return;
    }
    if (showTimeField && !time) {
      toast.error("Pon el tiempo manual");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/timing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId, bib: Number(bib), checkpoint, time: showTimeField ? time : undefined }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo registrar");
      toast.success(d.message ?? "Registrado");
      setBib("");
      setTime("");
      bibRef.current?.focus();
      const sp = new URLSearchParams({ race: raceId });
      const t = (await fetch(`/api/admin/timing?${sp.toString()}`, { cache: "no-store" }).then((x) => x.json())) as {
        events?: AdminTimingEventItem[];
        stats?: AdminTimingStats;
      };
      setEvents(t.events ?? []);
      setStats(t.stats ?? null);
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Error registrando tiempo");
    } finally {
      setBusy(false);
    }
  }

  async function compute() {
    setComputing(true);
    try {
      const res = await fetch("/api/admin/timing/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raceId }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo calcular");
      toast.success(d.message ?? "Resultados calculados");
      const r = (await fetch(`/api/admin/timing/results?race=${raceId}`, { cache: "no-store" }).then((x) => x.json())) as { rows?: AdminResultRow[] };
      setRows(r.rows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error calculando resultados");
    } finally {
      setComputing(false);
    }
  }

  const ff = filter.trim().toLowerCase();
  const recent = ff ? events.filter((ev) => String(ev.bib ?? "").includes(ff) || (ev.title ?? "").toLowerCase().includes(ff)) : events;

  if (races.length === 0) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-28">
        <Card className="mt-6 p-8 text-center">
          <p className="font-display text-snow">Sin carreras todavía</p>
          <p className="mt-1 text-sm text-mist">Crea una carrera en «Carreras» para poder cronometrar.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-snow">Cronometraje</h1>
        {timerRunning && <Badge tone="danger">EN VIVO</Badge>}
      </div>

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
              {r.timerStartMs && !r.timerStopMs ? " · EN CURSO" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* Cronómetro de la carrera */}
      <Card className="mt-4 p-4">
        {raceInfo?.timerStartMs == null ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Cronómetro</p>
              <p className="mt-1 text-sm text-mist">Inicia el cronómetro al dar la salida; cada dorsal se toma solo con el tiempo de carrera.</p>
            </div>
            <Button disabled={timerBusy || !raceId} onClick={() => void timerAction("start")} className="w-full sm:w-auto">
              {timerBusy ? "…" : "Iniciar carrera"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-mist">
                Tiempo de carrera {timerStopped ? "(detenido)" : ""}
              </p>
              <p className={`font-display mt-0.5 text-4xl font-black tabular-nums ${timerRunning ? "text-stryd" : "text-fog"}`}>
                {fmtSec(Math.floor(((raceInfo.timerStopMs ?? nowTick) - raceInfo.timerStartMs) / 1000))}
              </p>
              <p className="mt-0.5 text-xs text-mist">
                Salida: {new Date(raceInfo.timerStartMs).toLocaleTimeString("es-PA")}
                {timerStopped && raceInfo.timerStopMs ? ` · meta: ${new Date(raceInfo.timerStopMs).toLocaleTimeString("es-PA")}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {timerRunning ? (
                <Button variant="outline" disabled={timerBusy} onClick={() => void timerAction("stop")}>
                  Detener
                </Button>
              ) : (
                <Button size="sm" variant="ghost" disabled={timerBusy} onClick={() => setConfirmReset(true)}>
                  Reiniciar cronómetro
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Finishers" value={stats.finishers} tone="text-emerald-400" />
          <MiniStat label="En control" value={stats.checkpointed} tone="text-stryd" />
          <MiniStat label="Inscritos" value={stats.inscritos} tone="text-snow" />
        </div>
      )}

      {/* Registro de dorsal */}
      <Card className="mt-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">
          {autoAvailable && !manualTime ? "Registrar meta — el tiempo va solo" : "Registrar tiempo"}
        </p>
        <form onSubmit={record} className="mt-3 grid gap-3 sm:grid-cols-[130px_1fr_auto] sm:items-end">
          <label className="min-w-0 text-sm">
            <span className="mb-1 block text-xs text-mist">Dorsal</span>
            <input
              ref={bibRef}
              value={bib}
              onChange={(e) => setBib(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="123"
              className={inputCls}
              autoComplete="off"
            />
          </label>
          {showTimeField ? (
            <label className="min-w-0 text-sm">
              <span className="mb-1 block text-xs text-mist">Tiempo desde la salida</span>
              <input
                value={time}
                onChange={(e) => setTime(timeGroup(e.target.value))}
                inputMode="numeric"
                placeholder="52:11"
                className={inputCls}
                autoComplete="off"
              />
            </label>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Button type="submit" disabled={busy || !bib || (showTimeField && !time)} className="h-14 w-full sm:w-auto">
            {busy ? "…" : "Registrar"}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              { v: "finish", label: "Meta" },
              { v: "checkpoint", label: "Punto de control" },
            ] as const
          ).map((c) => (
            <button
              key={c.v}
              type="button"
              onClick={() => setCheckpoint(c.v)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                checkpoint === c.v ? "bg-stryd font-semibold text-black" : "bg-abyss text-mist ring-1 ring-inset ring-hairline hover:text-snow"
              }`}
            >
              {c.label}
            </button>
          ))}
          {autoAvailable && (
            <button
              type="button"
              onClick={() => setManualTime((m) => !m)}
              className={`ml-auto rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
                manualTime ? "bg-stryd-dim text-stryd" : "text-mist hover:text-snow"
              }`}
            >
              {manualTime ? "usar cronómetro" : "tiempo manual"}
            </button>
          )}
        </div>
        {timerStopped && !manualTime && (
          <p className="mt-2 rounded-xl border border-stryd/30 bg-stryd-dim px-3 py-2 text-xs text-stryd">
            El cronómetro está detenido — se pedirá tiempo manual (para finales tardíos). Pulsa «Reiniciar cronómetro» para volver al modo automático.
          </p>
        )}
      </Card>

      {err && (
        <Card className="mt-3 flex items-center justify-between p-4">
          <p className="text-sm text-red-400">{err}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {/* Resultados / podio */}
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Resultados ({rows.length})</p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/timing/export?race=${raceId}`} download>
                Exportar CSV
              </a>
            </Button>
            <Button size="sm" disabled={computing} onClick={() => void compute()}>
              {computing ? "Calculando…" : "Recalcular"}
            </Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-mist">Sin tiempos consolidados — registra meta y pulsa «Recalcular».</p>
        ) : (
          <div className="divide-y divide-hairline">
            {rows.slice(0, 20).map((r) => (
              <div key={r.pos} className={`flex items-center gap-3 px-4 py-2.5 ${r.pos <= 3 ? "bg-stryd/5" : ""}`}>
                <span className={`w-8 shrink-0 text-center font-display text-lg font-black ${r.pos === 1 ? "text-stryd" : r.pos <= 3 ? "text-stryd/70" : "text-mist"}`}>
                  {r.pos}
                </span>
                <span className="w-14 shrink-0 font-mono text-sm text-fog">#{r.bib ?? "—"}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-snow">{r.name}</span>
                {r.catPos != null && <span className="hidden text-xs text-mist sm:block">{r.catPos}ª cat.</span>}
                <span className="shrink-0 font-mono text-[15px] font-semibold text-snow">{r.time}</span>
              </div>
            ))}
            {rows.length > 20 && (
              <p className="px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-widest text-mist">
                Mostrando 20 de {rows.length} — el CSV incluye todos
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Historial */}
      <div className="mt-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Últimos registros ({events.length})</p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por dorsal o nombre…"
          className="mt-2 h-11 w-full rounded-xl border border-hairline bg-carbon px-4 text-snow placeholder-mist/60 outline-none focus:border-stryd/60"
        />
        <div className="mt-2 flex flex-col gap-1.5">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-card border border-hairline bg-carbon" />)}
          {!loading && recent.length === 0 && (
            <Card className="p-6 text-center text-sm text-mist">
              {events.length === 0 ? "Aún no hay tiempos registrados." : "Nada coincide con el filtro."}
            </Card>
          )}
          {!loading &&
            recent.map((ev) => (
              <Card key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-14 shrink-0 font-mono text-sm font-bold text-snow">#{ev.bib ?? "—"}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fog">{ev.title ?? "(inscripción borrada)"}</span>
                <Badge tone={ev.checkpoint === "finish" ? "stryd" : "neutral"}>{ev.checkpoint === "finish" ? "Meta" : "Control"}</Badge>
                <span className="shrink-0 font-mono text-sm font-semibold text-snow">{fmtSec(ev.elapsedSec)}</span>
                <button
                  type="button"
                  aria-label={`Deshacer dorsal ${ev.bib}`}
                  onClick={() => setUndo(ev)}
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
        open={undo !== null}
        onClose={() => setUndo(null)}
        title="Deshacer registro"
        description={
          <>
            Se quitará el tiempo del dorsal <span className="font-mono text-snow">#{undo?.bib}</span> en{" "}
            <strong className="text-snow">{undo?.checkpoint === "finish" ? "meta" : "el punto de control"}</strong>. Si había un registro
            anterior, ese queda como válido. «Resultados» no cambia hasta que pulses Recalcular.
          </>
        }
        confirmLabel="Deshacer"
        danger
        onConfirm={async () => {
          if (!undo) return;
          const res = await fetch(`/api/admin/timing/${undo.id}`, { method: "DELETE" });
          const d = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          if (!res.ok) throw new Error(d.error ?? "No se pudo deshacer");
          toast.success(d.message ?? "Registro eliminado");
          setUndo(null);
          const sp = new URLSearchParams({ race: raceId });
          const t = (await fetch(`/api/admin/timing?${sp.toString()}`, { cache: "no-store" }).then((x) => x.json())) as {
            events?: AdminTimingEventItem[];
            stats?: AdminTimingStats;
          };
          setEvents(t.events ?? []);
          setStats(t.stats ?? null);
        }}
      />

      <ConfirmSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reiniciar cronómetro"
        description={
          <>
            Se borra el inicio/paro del cronómetro de esta carrera y el estado vuelve a «inscripciones». <strong className="text-snow">Los
            tiempos ya registrados se conservan</strong> (se quitan individualmente si hace falta).
          </>
        }
        confirmLabel="Reiniciar"
        danger
        onConfirm={async () => {
          setConfirmReset(false);
          await timerAction("reset");
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
