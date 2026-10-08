"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import { slugify } from "@/components/admin/CarrerasBoard";

export type RaceEditable = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  location: string;
  price: number;
  platformFee: number;
  maxParticipants: number | null;
  startingBib: number | null;
  status: string;
  showTimer: boolean;
  showShirtSize: boolean;
  teamEnabled: boolean;
  padrinoEnabled: boolean;
};
export type DistRow = { id: string | null; uid: string; title: string; kilometers: string; price: string };
export type CatRow = { id: string | null; uid: string; title: string; minAge: string; maxAge: string; gender: string };

const STATUS_OPTS = [
  { v: "upcoming", l: "Próximamente" },
  { v: "accepting", l: "Inscripciones abiertas" },
  { v: "closed", l: "Cerrada" },
  { v: "active", l: "En curso" },
  { v: "finished", l: "Finalizada" },
];
const GENDERS = [
  { v: "ambos", l: "Ambos" },
  { v: "masculino", l: "Masculino" },
  { v: "femenino", l: "Femenino" },
];

const inputCls = "h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60";
const labelCls = "mb-1 block text-xs text-mist";
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function RaceEditor({
  race,
  distances: initDist,
  categories: initCat,
}: {
  race: RaceEditable;
  distances: { id: string; title: string; kilometers: number; price: number | null }[];
  categories: { id: string; title: string; minAge: number; maxAge: number; gender: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    title: race.title,
    slug: race.slug,
    date: race.date,
    startTime: race.startTime,
    location: race.location,
    description: race.description,
    price: String(race.price),
    platformFee: String(race.platformFee),
    maxParticipants: race.maxParticipants == null ? "" : String(race.maxParticipants),
    startingBib: race.startingBib == null ? "" : String(race.startingBib),
    status: race.status,
    showTimer: race.showTimer,
    showShirtSize: race.showShirtSize,
    teamEnabled: race.teamEnabled,
    padrinoEnabled: race.padrinoEnabled,
  });
  const [dists, setDists] = useState<DistRow[]>(
    initDist.map((d) => ({ id: d.id, uid: d.id, title: d.title, kilometers: String(d.kilometers), price: d.price == null ? "" : String(d.price) })),
  );
  const [cats, setCats] = useState<CatRow[]>(
    initCat.map((c) => ({ id: c.id, uid: c.id, title: c.title, minAge: String(c.minAge), maxAge: c.maxAge >= 100 ? "" : String(c.maxAge), gender: c.gender })),
  );
  const [confirmSave, setConfirmSave] = useState(false);
  const [delRow, setDelRow] = useState<{ kind: "dist" | "cat"; uid: string; title: string; server: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((cur) => ({
      ...cur,
      [k]: v,
      ...(k === "title" && (!cur.slug || cur.slug === slugify(cur.title)) ? { slug: slugify(String(v)) } : {}),
    }));
  }

  const coreValid =
    f.title.trim().length >= 3 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) &&
    /^\d{4}-\d{2}-\d{2}$/.test(f.date) &&
    num(f.price) != null &&
    num(f.price)! >= 0 &&
    dists.length >= 1 &&
    cats.length >= 1;

  function addDist() {
    if (dists.length >= 12) { toast.error("Máximo 12 modalidades"); return; }
    setDists((cur) => [...cur, { id: null, uid: crypto.randomUUID(), title: "", kilometers: "", price: "" }]);
  }
  function addCat() {
    if (cats.length >= 60) { toast.error("Máximo 60 categorías"); return; }
    setCats((cur) => [...cur, { id: null, uid: crypto.randomUUID(), title: "", minAge: "18", maxAge: "", gender: "ambos" }]);
  }

  function tryDelete(kind: "dist" | "cat", uid: string, title: string, server: boolean) {
    if (!server) {
      if (kind === "dist") setDists((cur) => cur.filter((d) => d.uid !== uid));
      else setCats((cur) => cur.filter((c) => c.uid !== uid));
      toast.info("Fila quitada (se confirmará al guardar)");
      return;
    }
    setDelRow({ kind, uid, title, server });
  }

  function payload() {
    return {
      title: f.title.trim(),
      slug: f.slug,
      date: f.date,
      startTime: f.startTime || undefined,
      location: f.location || undefined,
      description: f.description || undefined,
      price: Number(f.price),
      platformFee: num(f.platformFee) ?? 0,
      maxParticipants: num(f.maxParticipants),
      startingBib: num(f.startingBib),
      status: f.status,
      showTimer: f.showTimer,
      showShirtSize: f.showShirtSize,
      teamEnabled: f.teamEnabled,
      padrinoEnabled: f.padrinoEnabled,
      distances: dists.map((d) => ({
        ...(d.id ? { id: d.id } : {}),
        title: d.title.trim(),
        kilometers: Number(d.kilometers),
        price: num(d.price),
      })),
      categories: cats.map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        title: c.title.trim(),
        minAge: Number(c.minAge || 18),
        maxAge: num(c.maxAge) ?? 120,
        gender: c.gender,
      })),
    };
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/carreras/${race.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      toast.success("Carrera actualizada ✓");
      if (data.slug && data.slug !== race.slug) router.push(`/admin/carreras/${data.slug}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setBusy(false);
      setConfirmSave(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/carreras" className="font-mono text-[11px] uppercase tracking-widest text-mist hover:text-snow">← Carreras</Link>
        <a href={`/carrera/${f.slug}`} target="_blank" rel="noreferrer" className="font-mono text-[11px] uppercase tracking-widest text-mist hover:text-stryd">Ver pública ↗</a>
      </div>

      <h1 className="font-display mt-3 text-2xl font-bold text-snow sm:text-3xl">{race.title}</h1>

      <Card className="mt-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Datos</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelCls}>Título *</span><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Slug (URL) *</span><input className={`${inputCls} font-mono`} value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></label>
          <label><span className={labelCls}>Fecha *</span><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label><span className={labelCls}>Hora de salida</span><input type="time" className={inputCls} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Lugar</span><input className={inputCls} value={f.location} onChange={(e) => set("location", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={labelCls}>Descripción</span><textarea className={`${inputCls} h-24 resize-none py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Precios y cupos</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label><span className={labelCls}>Precio base (B/.) *</span><input inputMode="decimal" className={inputCls} value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} /></label>
          <label><span className={labelCls}>Fee plataforma Yappy</span><input inputMode="decimal" className={inputCls} value={f.platformFee} onChange={(e) => set("platformFee", e.target.value.replace(/[^\d.]/g, ""))} /></label>
          <label><span className={labelCls}>Cupo máximo</span><input inputMode="numeric" className={inputCls} value={f.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value.replace(/\D/g, ""))} placeholder="sin límite" /></label>
          <label><span className={labelCls}>Dorsal inicial</span><input inputMode="numeric" className={inputCls} value={f.startingBib} onChange={(e) => set("startingBib", e.target.value.replace(/\D/g, ""))} placeholder="1" /></label>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Estado y opciones</p>
        <div className="mt-3 grid gap-3">
          <label><span className={labelCls}>Estado de la carrera *</span>
            <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ["showTimer", "Mostrar timer"],
              ["showShirtSize", "Tallas de camisa"],
              ["teamEnabled", "Equipos"],
              ["padrinoEnabled", "Padrinos"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => set(key, !f[key])} aria-pressed={f[key]} className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${f[key] ? "bg-stryd text-black font-semibold" : "bg-abyss text-mist ring-1 ring-inset ring-hairline hover:text-snow"}`}>
                {f[key] ? "✓ " : ""}{label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Modalidades */}
      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Modalidades ({dists.length})</p>
          <Button size="sm" variant="outline" onClick={addDist}>+ Agregar</Button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {dists.map((d) => (
            <div key={d.uid} className="grid grid-cols-[1fr_80px_80px_36px] items-center gap-2">
              <input className={`${inputCls} h-10`} value={d.title} placeholder="5K, 10K…" onChange={(e) => setDists((cur) => cur.map((x) => (x.uid === d.uid ? { ...x, title: e.target.value } : x)))} />
              <input className={`${inputCls} h-10 font-mono`} inputMode="decimal" value={d.kilometers} placeholder="km" onChange={(e) => setDists((cur) => cur.map((x) => (x.uid === d.uid ? { ...x, kilometers: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
              <input className={`${inputCls} h-10 font-mono`} inputMode="decimal" value={d.price} placeholder="$" onChange={(e) => setDists((cur) => cur.map((x) => (x.uid === d.uid ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
              <button type="button" aria-label={`Quitar ${d.title}`} disabled={!d.title && !d.kilometers ? false : undefined} onClick={() => tryDelete("dist", d.uid, d.title || "modalidad", !!d.id)} className="grid h-10 place-items-center rounded-lg text-mist transition hover:bg-red-950/50 hover:text-red-400">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5.5 4V2.5A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.5 1.5V4m2 0v9A1.5 1.5 0 0 1 11 14.5H5A1.5 1.5 0 0 1 3.5 13V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Categorías */}
      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Categorías ({cats.length})</p>
          <Button size="sm" variant="outline" onClick={addCat}>+ Agregar</Button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {cats.map((c) => (
            <div key={c.uid} className="grid grid-cols-[1fr_58px_58px_92px_36px] items-center gap-2">
              <input className={`${inputCls} h-10`} value={c.title} placeholder="Elite, Master…" onChange={(e) => setCats((cur) => cur.map((x) => (x.uid === c.uid ? { ...x, title: e.target.value } : x)))} />
              <input className={`${inputCls} h-10 font-mono`} inputMode="numeric" value={c.minAge} placeholder="min" onChange={(e) => setCats((cur) => cur.map((x) => (x.uid === c.uid ? { ...x, minAge: e.target.value.replace(/\D/g, "") } : x)))} />
              <input className={`${inputCls} h-10 font-mono`} inputMode="numeric" value={c.maxAge} placeholder="∞" onChange={(e) => setCats((cur) => cur.map((x) => (x.uid === c.uid ? { ...x, maxAge: e.target.value.replace(/\D/g, "") } : x)))} />
              <select className={`${inputCls} h-10 text-sm`} value={c.gender} onChange={(e) => setCats((cur) => cur.map((x) => (x.uid === c.uid ? { ...x, gender: e.target.value } : x)))}>
                {GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
              </select>
              <button type="button" aria-label={`Quitar ${c.title}`} onClick={() => tryDelete("cat", c.uid, c.title || "categoría", !!c.id)} className="grid h-10 place-items-center rounded-lg text-mist transition hover:bg-red-950/50 hover:text-red-400">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 4h12M5.5 4V2.5A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.5 1.5V4m2 0v9A1.5 1.5 0 0 1 11 14.5H5A1.5 1.5 0 0 1 3.5 13V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist">Edad máxima vacía = sin límite. El wizard asigna categoría por edad/género automáticamente.</p>
      </Card>

      <div className="mt-5 flex items-center gap-3">
        <Button size="lg" className="flex-1 sm:flex-none" disabled={!coreValid || busy} onClick={() => setConfirmSave(true)}>
          {busy ? "Guardando…" : "Guardar carrera"}
        </Button>
        {!coreValid && <p className="text-xs text-red-400">Revisa título, slug, fecha, precio y filas vacías.</p>}
      </div>

      <ConfirmSheet
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Guardar cambios"
        description={<>Se actualizarán los datos de <b className="text-snow">{f.title}</b>, sus {dists.length} modalidades y {cats.length} categorías.</>}
        confirmLabel="Guardar"
        onConfirm={save}
      />

      <ConfirmSheet
        open={delRow !== null}
        onClose={() => setDelRow(null)}
        title={delRow?.kind === "dist" ? "Quitar modalidad" : "Quitar categoría"}
        description={<>Se eliminará <b className="text-snow">{delRow?.title}</b> de la carrera. Las inscripciones existentes que la usaban quedarán sin esa referencia. ¿Seguro?</>}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (!delRow) return;
          if (delRow.kind === "dist") setDists((cur) => cur.filter((x) => x.uid !== delRow.uid));
          else setCats((cur) => cur.filter((x) => x.uid !== delRow.uid));
          toast.info("Fila marcada para eliminar — presiona Guardar carrera");
          setDelRow(null);
        }}
      />
    </section>
  );
}
