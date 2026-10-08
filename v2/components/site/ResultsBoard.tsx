"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { PublicResultRow } from "@/lib/db/queries";

const PER_PAGE = 50;

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function ResultsBoard({ rows }: { rows: PublicResultRow[] }) {
  const [q, setQ] = useState("");
  const [distance, setDistance] = useState<string | null>(null);
  const [visible, setVisible] = useState(PER_PAGE);

  const distances = useMemo(
    () => Array.from(new Set(rows.map((r) => r.distance).filter((d): d is string => !!d))),
    [rows],
  );

  const filtered = useMemo(() => {
    const nl = q.trim().toLowerCase();
    const nb = q.trim().replace(/\D/g, "");
    return rows.filter((r) => {
      if (distance && r.distance !== distance) return false;
      if (!nl) return true;
      return r.name.toLowerCase().includes(nl) || (nb.length >= 2 && String(r.bib ?? "").includes(nb));
    });
  }, [rows, q, distance]);

  const noFilter = !q.trim() && !distance;
  const podium = noFilter ? filtered.slice(0, 3) : [];
  const catWinners = noFilter
    ? rows.filter((r) => r.catPos === 1 && r.category && (r.pos ?? 99) > 3).slice(0, 12)
    : [];
  const list = filtered.slice(0, visible);

  return (
    <div>
      {/* Podio */}
      {podium.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {podium.map((p, i) => (
            <motion.div
              key={p.name + String(p.pos)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`rounded-card border p-6 ${p.pos === 1 ? "border-stryd/60 bg-stryd-dim shadow-glow" : "border-hairline bg-carbon"}`}
            >
              <p className={`font-display text-6xl font-black leading-none ${p.pos === 1 ? "text-stryd" : "text-fog"}`}>{p.pos}</p>
              <p className="mt-3 truncate text-lg font-semibold text-snow">{p.name}</p>
              <p className="mt-0.5 font-mono text-sm text-stryd">#{p.bib ?? "—"}</p>
              <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-snow">{fmtTime(p.timeSec)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.category && <Badge tone="neutral">{p.category}</Badge>}
                {p.distance && <Badge tone="neutral">{p.distance}</Badge>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ganadores por categoría */}
      {catWinners.length > 0 && (
        <div className="mt-6 rounded-card border border-hairline bg-carbon p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Ganadores por categoría</p>
          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {catWinners.map((w) => (
              <div key={w.name + String(w.pos)} className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-snow">{w.name}</span>
                  <span className="ml-2 text-mist">{w.category}</span>
                </span>
                <span className="shrink-0 font-mono font-semibold text-snow">{fmtTime(w.timeSec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda + filtros */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisible(PER_PAGE);
          }}
          placeholder="Buscar por nombre o dorsal…"
          className="h-11 w-full flex-1 rounded-xl border border-hairline bg-carbon px-4 text-snow placeholder-mist/60 outline-none transition focus:border-stryd/60"
        />
        <p className="shrink-0 font-mono text-xs uppercase tracking-widest text-mist">
          {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {distances.length > 1 && (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {[null, ...distances].map((d) => (
            <button
              key={d ?? "todas"}
              type="button"
              onClick={() => {
                setDistance(d);
                setVisible(PER_PAGE);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                distance === d ? "bg-stryd font-semibold text-black" : "text-fog ring-1 ring-inset ring-hairline hover:text-snow"
              }`}
            >
              {d ?? "Todas"}
            </button>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="mt-5 flex flex-col gap-1.5">
        {list.length === 0 && (
          <div className="rounded-card border border-dashed border-hairline bg-carbon p-8 text-center text-sm text-mist">
            Nadie coincide con la búsqueda.
          </div>
        )}
        {list.map((r) => (
          <div
            key={`${r.pos}-${r.name}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 sm:gap-4 ${noFilter && r.pos && r.pos <= 3 ? "border-stryd/40 bg-stryd-dim" : "border-hairline bg-carbon"}`}
          >
            <span className="w-9 shrink-0 font-mono text-sm text-mist">{r.pos ?? "—"}</span>
            <span className="w-14 shrink-0 font-mono text-sm font-semibold text-stryd">#{r.bib ?? "—"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-snow">{r.name}</span>
              {(r.team || r.category) && (
                <span className="block truncate text-xs text-mist">
                  {[r.category, r.team].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            {r.catPos != null && <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-mist md:block">{r.catPos}ª cat.</span>}
            <span className="w-20 shrink-0 text-right font-mono text-sm font-bold text-snow">{fmtTime(r.timeSec)}</span>
          </div>
        ))}
      </div>

      {visible < filtered.length && (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setVisible((v) => v + PER_PAGE)}>
          Ver más ({filtered.length - visible} restantes)
        </Button>
      )}
    </div>
  );
}
