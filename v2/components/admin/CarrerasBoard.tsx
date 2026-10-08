"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { formatDateEs, formatMoney } from "@/lib/format";

export type RaceListItem = { id: string; slug: string; title: string; date: string; status: string; price: number; inscritos: number; preinscritos: number };

const STATUS_LABEL: Record<string, { txt: string; tone: "neutral" | "stryd" | "success" | "danger" }> = {
  upcoming: { txt: "Próxima", tone: "neutral" },
  accepting: { txt: "Abierta", tone: "success" },
  closed: { txt: "Cerrada", tone: "danger" },
  active: { txt: "En curso", tone: "stryd" },
  finished: { txt: "Finalizada", tone: "neutral" },
};

export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const inputCls = "h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60";
const labelCls = "mb-1 block text-xs text-mist";

export function CarrerasBoard({ races }: { races: RaceListItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", slug: "", date: "", startTime: "", location: "", price: "20", platformFee: "0", maxParticipants: "" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof f, v: string) {
    setF((cur) => ({ ...cur, [k]: v, ...(k === "title" && (!cur.slug || cur.slug === slugify(cur.title)) ? { slug: slugify(v) } : {}) }));
  }

  const valid = f.title.trim().length >= 3 && /^[a-z0-9-]{3,60}$/.test(f.slug) && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && Number(f.price) >= 0;

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/carreras", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: f.title.trim(), slug: f.slug, date: f.date, startTime: f.startTime || undefined, location: f.location || undefined, description: undefined,
          price: Number(f.price), platformFee: Number(f.platformFee || 0), maxParticipants: f.maxParticipants === "" ? null : Number(f.maxParticipants),
          status: "upcoming", showTimer: true, showShirtSize: false, teamEnabled: false, padrinoEnabled: false, startingBib: null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear");
      toast.success(`Carrera creada — define modalidades y categorías`);
      setOpen(false);
      router.push(`/admin/carreras/${data.slug}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error creando carrera");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">{races.length} carreras</p>
        <Button size="sm" onClick={() => setOpen(true)}>+ Nueva carrera</Button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {races.length === 0 && (
          <Card className="p-8 text-center">
            <p className="font-display text-snow">No hay carreras todavía</p>
            <p className="mt-1 text-sm text-mist">Crea la primera con el botón de arriba.</p>
          </Card>
        )}
        {races.map((r) => {
          const st = STATUS_LABEL[r.status] ?? { txt: r.status, tone: "neutral" as const };
          return (
            <Link key={r.id} href={`/admin/carreras/${r.slug}`} className="block">
              <Card interactive className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-semibold text-snow">{r.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-mist">{formatDateEs(r.date)} · {formatMoney(r.price)} · {r.inscritos} inscritos · {r.preinscritos} pre</span>
                </span>
                <Badge tone={st.tone}>{st.txt}</Badge>
                <svg className="h-4 w-4 shrink-0 text-mist" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </Card>
            </Link>
          );
        })}
      </div>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} title="Nueva carrera">
        <div className="flex flex-col gap-3">
          <label><span className={labelCls}>Título *</span><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Carrera Nocturna 2026" /></label>
          <label><span className={labelCls}>Slug (URL) *</span><input className={`${inputCls} font-mono`} value={f.slug} onChange={(e) => set("slug", e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} placeholder="carrera-nocturna-2026" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Fecha *</span><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label><span className={labelCls}>Hora salida</span><input type="time" className={inputCls} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} /></label>
            <label><span className={labelCls}>Precio base (B/.) *</span><input inputMode="decimal" className={inputCls} value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} /></label>
            <label><span className={labelCls}>Fee plataforma</span><input inputMode="decimal" className={inputCls} value={f.platformFee} onChange={(e) => set("platformFee", e.target.value.replace(/[^\d.]/g, ""))} /></label>
            <label className="col-span-2"><span className={labelCls}>Lugar</span><input className={inputCls} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Cinta Costera" /></label>
            <label className="col-span-2"><span className={labelCls}>Cupo máximo (opcional)</span><input inputMode="numeric" className={inputCls} value={f.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value.replace(/\D/g, ""))} /></label>
          </div>
          <p className="text-xs text-mist">Se creará como <b className="text-fog">Próxima</b> con modalidad y categoría &quot;General&quot; para que puedas ajustarlas después.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button disabled={!valid || busy} onClick={() => setConfirming(true)}>Crear carrera</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Crear carrera"
        description={<>Se creará <b className="text-snow">{f.title}</b> ({f.date}) con precio base {formatMoney(Number(f.price) || 0)}. ¿Continuar?</>}
        confirmLabel="Crear"
        onConfirm={create}
      />
    </section>
  );
}
