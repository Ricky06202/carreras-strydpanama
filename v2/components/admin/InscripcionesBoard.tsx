"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/format";
import type { AdminRegItem, AdminRegStats } from "@/lib/admin/registrations";

export type RaceOption = { id: string; title: string; date: string; status: string };

type ConfirmReq = {
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<string>;
};

const STATUS_CHIPS = [
  { v: "todos", label: "Todos" },
  { v: "preinscrito", label: "Preinscritos" },
  { v: "inscrito", label: "Inscritos" },
  { v: "anulado", label: "Anulados" },
];
const PAYMENT_CHIPS = [
  { v: "todos", label: "Todo pago" },
  { v: "pendiente", label: "Pendiente" },
  { v: "pagado", label: "Pagado" },
  { v: "reembolsado", label: "Reembolsado" },
];

const statusTone = { preinscrito: "stryd", inscrito: "success", anulado: "danger" } as const;
const payTone = { pendiente: "neutral", pagado: "success", reembolsado: "danger", exento: "neutral" } as const;
const payLabel = { pendiente: "Pendiente", pagado: "Pagado", reembolsado: "Reembolsado", exento: "Exento" } as const;

export function InscripcionesBoard({ races }: { races: RaceOption[] }) {
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState("todos");
  const [payment, setPayment] = useState("todos");
  const [items, setItems] = useState<AdminRegItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminRegStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmReq | null>(null);
  const [draft, setDraft] = useState({ phone: "", shirtSize: "", teamName: "", bibNumber: "" });
  const pageRef = useRef(1);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const url = useCallback((p: number) => {
    const sp = new URLSearchParams({ race: raceId });
    if (dq) sp.set("q", dq);
    if (status !== "todos") sp.set("status", status);
    if (payment !== "todos") sp.set("payment", payment);
    if (p > 1) sp.set("page", String(p));
    return `/api/admin/inscripciones?${sp.toString()}`;
  }, [raceId, dq, status, payment]);

  const load = useCallback(async (p: number) => {
    if (!raceId) return;
    const me = ++reqId.current;
    if (p === 1) setLoading(true); else setLoadingMore(true);
    setErr(null);
    try {
      const res = await fetch(url(p), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al cargar");
      if (me !== reqId.current) return;
      setItems((cur) => (p === 1 ? data.items : [...cur, ...data.items]));
      setTotal(data.total);
      setStats(data.stats);
      pageRef.current = p;
    } catch (e) {
      if (me === reqId.current) setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      if (me === reqId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [raceId, url]);

  useEffect(() => { void load(1); }, [dq, status, payment, raceId]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCard(item: AdminRegItem) {
    if (openId === item.id) { setOpenId(null); return; }
    setOpenId(item.id);
    setDraft({
      phone: item.phone ?? "",
      shirtSize: item.shirtSize ?? "",
      teamName: item.teamName ?? "",
      bibNumber: item.bibNumber != null ? String(item.bibNumber) : "",
    });
  }

  async function act(id: string, action: string, payload?: unknown): Promise<string> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/inscripciones/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No se pudo completar");
      return (data.message as string) ?? "Listo";
    } finally {
      setBusyId(null);
    }
  }

  function askPayment(item: AdminRegItem) {
    setConfirm({
      id: item.id,
      title: "Confirmar pago",
      description: `¿Marcar el pago de ${item.title} como realizado? Se le asigna dorsal y se envía el correo de confirmación.`,
      confirmLabel: "Sí, confirmar pago",
      run: () => act(item.id, "confirm"),
    });
  }

  function askRevoke(item: AdminRegItem) {
    setConfirm({
      id: item.id,
      title: "Anular inscripción",
      description: `${item.title} quedará anulado y su cupo libre. Puedes restaurarlo si fue un error.`,
      confirmLabel: "Anular",
      danger: true,
      run: () => act(item.id, "anular"),
    });
  }

  function askRestore(item: AdminRegItem) {
    setConfirm({
      id: item.id,
      title: "Restaurar inscripción",
      description: `${item.title} volverá a estar activo (${item.paymentStatus === "pagado" ? "inscrito" : "preinscrito"}).`,
      confirmLabel: "Restaurar",
      run: () => act(item.id, "restaurar"),
    });
  }

  function askRefund(item: AdminRegItem) {
    setConfirm({
      id: item.id,
      title: "Marcar reembolso",
      description: `Registra que se devolvió ${formatMoney(item.amountPaid)} a ${item.title}.`,
      confirmLabel: "Marcar reembolso",
      danger: true,
      run: () => act(item.id, "reembolsar"),
    });
  }

  function saveDraft(item: AdminRegItem) {
    const payload: Record<string, unknown> = {};
    if (draft.phone !== (item.phone ?? "")) payload.phone = draft.phone;
    if (draft.shirtSize && draft.shirtSize !== item.shirtSize) payload.shirtSize = draft.shirtSize;
    if (draft.teamName !== (item.teamName ?? "")) payload.teamName = draft.teamName;
    const bib = draft.bibNumber === "" ? null : Number(draft.bibNumber);
    if (bib != null && bib !== item.bibNumber) payload.bibNumber = bib;
    if (Object.keys(payload).length === 0) { toast.info("No hay cambios que guardar"); return; }
    setConfirm({
      id: item.id,
      title: "Guardar cambios",
      description: `Se actualizarán ${Object.keys(payload).length} campo(s) de ${item.title}.`,
      confirmLabel: "Guardar",
      run: () => act(item.id, "editar", payload),
    });
  }

  const shown = items.length;
  const hasMore = shown < total;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mist">Carrera</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)} className="h-11 w-full rounded-xl border border-hairline bg-carbon px-3 text-snow outline-none focus:border-stryd/60">
            {races.map((r) => <option key={r.id} value={r.id}>{r.title} — {r.date.slice(0, 10)}</option>)}
          </select>
        </label>
        <div className="flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mist">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, cédula, código o dorsal" className="h-11 w-full rounded-xl border border-hairline bg-carbon px-4 text-snow placeholder-mist/50 outline-none focus:border-stryd/60" />
        </div>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Inscritos" value={String(stats.inscritos)} tone="text-emerald-400" />
          <Stat label="Pend. pago" value={String(stats.pendientes)} tone="text-stryd" />
          <Stat label="Recaudado" value={formatMoney(stats.recaudacion)} tone="text-snow" />
        </div>
      )}

      <div className="scrollbar-none mt-4 -mx-4 flex gap-2 overflow-x-auto px-4">
        {STATUS_CHIPS.map((c) => <Chip key={c.v} active={status === c.v} onClick={() => setStatus(c.v)} label={c.label} />)}
        <span className="w-px shrink-0 bg-hairline" />
        {PAYMENT_CHIPS.map((c) => <Chip key={c.v} active={payment === c.v} onClick={() => setPayment(c.v)} label={c.label} />)}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-mist">
        {loading ? "Cargando…" : `${shown} de ${total} inscripciones`}
      </p>

      {err && (
        <Card className="mt-3 flex items-center justify-between p-4">
          <p className="text-sm text-red-400">{err}</p>
          <Button size="sm" variant="outline" onClick={() => void load(1)}>Reintentar</Button>
        </Card>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
        {!loading && items.length === 0 && !err && (
          <Card className="p-8 text-center">
            <p className="font-display text-snow">Sin resultados</p>
            <p className="mt-1 text-sm text-mist">Ajusta la búsqueda o los filtros.</p>
          </Card>
        )}
        {!loading && items.map((item) => (
          <RegCard
            key={item.id}
            item={item}
            open={openId === item.id}
            busy={busyId === item.id}
            draft={draft}
            setDraft={setDraft}
            onToggle={() => openCard(item)}
            onConfirmPay={() => askPayment(item)}
            onRevoke={() => askRevoke(item)}
            onRestore={() => askRestore(item)}
            onRefund={() => askRefund(item)}
            onSave={() => saveDraft(item)}
          />
        ))}
        {!loading && hasMore && (
          <Button variant="outline" className="mt-2 w-full" disabled={loadingMore} onClick={() => void load(pageRef.current + 1)}>
            {loadingMore ? "Cargando…" : `Cargar más (${total - shown} restantes)`}
          </Button>
        )}
      </div>

      <ConfirmSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={async () => {
          if (!confirm) return;
          const msg = await confirm.run();
          toast.success(msg);
          setOpenId(null);
          await load(1);
        }}
      />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mist">{label}</p>
      <p className={`font-display mt-0.5 truncate text-lg font-extrabold ${tone}`}>{value}</p>
    </Card>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-stryd text-black font-semibold" : "bg-carbon text-fog ring-1 ring-inset ring-hairline hover:text-snow"}`}>
      {label}
    </button>
  );
}

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-card border border-hairline bg-carbon" />;
}

type Draft = { phone: string; shirtSize: string; teamName: string; bibNumber: string };
type CardProps = {
  item: AdminRegItem;
  open: boolean;
  busy: boolean;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onToggle: () => void;
  onConfirmPay: () => void;
  onRevoke: () => void;
  onRestore: () => void;
  onRefund: () => void;
  onSave: () => void;
};

function RegCard({ item, open, busy, draft, setDraft, onToggle, onConfirmPay, onRevoke, onRestore, onRefund, onSave }: CardProps) {
  return (
    <Card interactive className={open ? "border-stryd/40" : ""}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15px] font-semibold text-snow">{item.title}</span>
          <span className="mt-0.5 block truncate text-xs text-mist">
            {item.bibNumber != null ? `Dorsal ${item.bibNumber} · ` : ""}{item.cedula ?? "sin cédula"}{item.distanceTitle ? ` · ${item.distanceTitle}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={statusTone[item.status as keyof typeof statusTone] ?? "neutral"}>{item.status}</Badge>
          <Badge tone={payTone[item.paymentStatus as keyof typeof payTone] ?? "neutral"}>{payLabel[item.paymentStatus as keyof typeof payLabel] ?? item.paymentStatus}</Badge>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-mist transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="detail" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-hairline px-4 py-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field k="Código" v={item.confirmationCode} mono />
                <Field k="Monto" v={formatMoney(item.amountPaid)} mono />
                <Field k="Email" v={item.email} />
                <Field k="Cédula" v={item.cedula ?? "—"} mono />
                <Field k="Categoría" v={item.categoryTitle ?? "—"} />
                <Field k="Talla" v={item.shirtSize ?? "—"} />
                {item.discountCode && <Field k="Código usado" v={item.discountCode} mono />}
                {item.teamName && <Field k="Equipo" v={item.teamName} />}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-sm"><span className="mb-1 block text-xs text-mist">Teléfono</span>
                  <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} inputMode="numeric" className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
                </label>
                <label className="text-sm"><span className="mb-1 block text-xs text-mist">Dorsal</span>
                  <input value={draft.bibNumber} onChange={(e) => setDraft({ ...draft, bibNumber: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 font-mono text-snow outline-none focus:border-stryd/60" />
                </label>
                <label className="text-sm"><span className="mb-1 block text-xs text-mist">Talla</span>
                  <select value={draft.shirtSize} onChange={(e) => setDraft({ ...draft, shirtSize: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60">
                    {["", "S", "M", "L", "XL", "XXL"].map((s) => <option key={s} value={s}>{s || "—"}</option>)}
                  </select>
                </label>
                <label className="text-sm"><span className="mb-1 block text-xs text-mist">Equipo</span>
                  <input value={draft.teamName} onChange={(e) => setDraft({ ...draft, teamName: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={busy} onClick={onSave}>Guardar cambios</Button>
                {item.status !== "anulado" && item.paymentStatus === "pendiente" && (
                  <Button size="sm" disabled={busy} onClick={onConfirmPay}>{busy ? "…" : "Confirmar pago"}</Button>
                )}
                {item.paymentStatus === "pagado" && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={onRefund}>Reembolsar</Button>
                )}
                {item.status === "anulado" ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={onRestore}>Restaurar</Button>
                ) : (
                  <Button size="sm" variant="danger" disabled={busy} onClick={onRevoke}>Anular</Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-wider text-mist">{k}</p>
      <p className={`truncate text-fog ${mono ? "font-mono text-[13px]" : ""}`} title={v}>{v}</p>
    </div>
  );
}
