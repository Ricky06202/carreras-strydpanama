"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type AdminExpense,
  type FinanceStats,
} from "@/lib/admin/finance-constants";

export type FinanceRaceOption = { id: string; title: string; date: string; status: string };

type FormState = {
  title: string;
  beneficiary: string;
  amount: string;
  payDate: string;
  method: string;
  reference: string;
  notes: string;
  category: string;
};

const emptyForm = (): FormState => ({
  title: "",
  beneficiary: "",
  amount: "",
  payDate: new Date().toISOString().slice(0, 10),
  method: "Yappy",
  reference: "",
  notes: "",
  category: "",
});

const money = (n: number) => `B/. ${(Number(n) || 0).toFixed(2)}`;

type JsPdfCtor = new (o?: unknown) => {
  internal: { pageSize: { getWidth: () => number } };
  setFont: (f: string, s?: string) => void;
  setFontSize: (n: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (n: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
  text: (t: string, x: number, y: number, o?: unknown) => void;
  getTextWidth: (t: string) => number;
  save: (name: string) => void;
  lastAutoTable?: { finalY: number };
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-lib="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.lib = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

async function loadJsPdf(): Promise<JsPdfCtor> {
  const w = window as unknown as { jspdf?: { jsPDF: JsPdfCtor } };
  if (!w.jspdf) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
  }
  const w2 = window as unknown as { jspdf?: { jsPDF: JsPdfCtor }; jspdfAutoTable?: unknown };
  if (!w2.jspdfAutoTable) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js");
  }
  if (!w2.jspdf) throw new Error("jsPDF no disponible");
  return w2.jspdf.jsPDF;
}

export function FinanzasBoard({ races }: { races: FinanceRaceOption[] }) {
  const [raceId, setRaceId] = useState(races[0]?.id ?? "");
  const [expenses, setExpenses] = useState<AdminExpense[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminExpense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<AdminExpense | null>(null);
  const [exporting, setExporting] = useState(false);

  const race = useMemo(() => races.find((r) => r.id === raceId), [races, raceId]);

  const load = useCallback(async () => {
    if (!raceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/expenses?raceId=${encodeURIComponent(raceId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error al cargar");
      setExpenses(data.expenses ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const sorted = [...expenses].sort(
      (a, b) => String(a.payDate).localeCompare(String(b.payDate)) || a.amount - b.amount,
    );
    const byDay = new Map<string, { day: string; items: AdminExpense[]; total: number }>();
    for (const e of sorted) {
      const day = String(e.payDate || "").slice(0, 10) || "Sin fecha";
      if (!byDay.has(day)) byDay.set(day, { day, items: [], total: 0 });
      const g = byDay.get(day)!;
      g.items.push(e);
      g.total += Number(e.amount) || 0;
    }
    return [...byDay.values()];
  }, [expenses]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(e: AdminExpense) {
    setEditing(e);
    setForm({
      title: e.title,
      beneficiary: e.beneficiary,
      amount: String(e.amount ?? ""),
      payDate: String(e.payDate || "").slice(0, 10),
      method: e.method || "Yappy",
      reference: e.reference,
      notes: e.notes,
      category: e.category,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim() || form.amount === "" || !form.payDate) {
      toast.error("Referencia, monto y fecha son obligatorios");
      return;
    }
    if (!raceId) { toast.error("Selecciona una carrera"); return; }
    setSaving(true);
    try {
      const payload = {
        raceId,
        title: form.title,
        beneficiary: form.beneficiary,
        amount: Number(form.amount),
        payDate: form.payDate,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
        category: form.category,
      };
      const res = editing
        ? await fetch(`/api/admin/expenses/${editing.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/expenses", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      toast.success(editing ? "Pago actualizado" : "Pago registrado");
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/admin/expenses/${toDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "No se pudo eliminar");
    }
    toast.success("Pago eliminado");
    await load();
  }

  async function exportPDF() {
    if (!race) return;
    const s = stats ?? { recaudado: 0, salientes: 0, saldo: 0, confirmados: 0, pendientes: 0 };
    if (expenses.length === 0 && s.recaudado === 0) {
      toast.error("No hay datos financieros para esta carrera todavía");
      return;
    }
    setExporting(true);
    try {
      // jspdf se cargar por CDN en el navegador: mantiene el paquete fuera del
      // bundle del worker (su "exports" no define la condición workerd).
      const jsPDF = await loadJsPdf();
      const autoTable = (window as unknown as { jspdfAutoTable: (doc: unknown, o: unknown) => void }).jspdfAutoTable;

      const ORANGE: [number, number, number] = [232, 138, 30];
      const GREEN: [number, number, number] = [40, 130, 70];
      const RED: [number, number, number] = [180, 40, 40];
      const DARK: [number, number, number] = [30, 30, 30];

      const doc = new jsPDF({ orientation: "landscape" });
      const W = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.text("STRYD PANAMÁ", 14, 18);
      const wBrand = doc.getTextWidth("STRYD PANAMÁ");
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text("— INFORME FINANCIERO EJECUTIVO", 14 + wBrand + 2, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Carrera: ${race.title}`, 14, 26);
      doc.setFontSize(9);
      doc.text(`Fecha de la carrera: ${String(race.date).slice(0, 10)}  |  Generado: ${new Date().toLocaleString("es-PA")}`, 14, 32);

      const boxY = 37;
      const boxH = 34;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.6);
      doc.roundedRect(14, boxY, W - 28, boxH, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text("RESUMEN EJECUTIVO", 18, boxY + 7);
      const colW = (W - 28) / 3;
      const kpi = (i: number, label: string, value: string, color: number[]) => {
        const cx = 14 + colW * i + colW / 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(label, cx, boxY + 14, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, cx, boxY + 24, { align: "center" });
      };
      kpi(0, "Recaudación Neta:", `$${s.recaudado.toFixed(2)}`, DARK);
      kpi(1, "Pagos Salientes:", `$${s.salientes.toFixed(2)}`, RED);
      kpi(2, "SALDO DISPONIBLE:", `$${s.saldo.toFixed(2)}`, s.saldo >= 0 ? GREEN : RED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `Inscritos confirmados: ${s.confirmados}  |  Pendientes de pago: ${s.pendientes}  |  Pagos salientes registrados: ${expenses.length}`,
        18,
        boxY + boxH - 4,
      );

      const body: (string | { content: string; colSpan: number; styles: { fontStyle: string } })[][] = [];
      grouped.forEach((g) => {
        g.items.forEach((e) => {
          body.push([
            e.payDate ? String(e.payDate).slice(0, 10) : "-",
            e.title || "-",
            e.beneficiary || "-",
            e.method || "-",
            e.reference || "-",
            `$${(Number(e.amount) || 0).toFixed(2)}`,
          ]);
        });
      });
      if (body.length === 0) body.push([{ content: "Sin pagos salientes registrados", colSpan: 6, styles: { fontStyle: "italic" } }]);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text("PAGOS SALIENTES", 14, boxY + boxH + 11);
      autoTable(doc, {
        startY: boxY + boxH + 14,
        head: [["Fecha Pago", "Referencia", "Beneficiario", "Método", "Comprobante", "Monto"]],
        body,
        foot: [[{ content: "TOTAL", colSpan: 5 }, `$${s.salientes.toFixed(2)}`]],
        styles: { fontSize: 9, cellPadding: 2.4 },
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        footStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold" },
        columnStyles: { 5: { halign: "right" } },
        theme: "grid",
      });

      const byCat = new Map<string, number>();
      expenses.forEach((e) => {
        const c = String(e.category || "").trim() || "Sin categoría";
        byCat.set(c, (byCat.get(c) || 0) + (Number(e.amount) || 0));
      });
      const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
      let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || boxY + boxH + 20) + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text("DISTRIBUCIÓN POR CATEGORÍA DE GASTO", 14, y);
      y += 8;
      const maxCat = Math.max(1, ...cats.map((c) => c[1]));
      cats.forEach(([label, amt]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(DARK[0], DARK[1], DARK[2]);
        doc.text(String(label), 18, y + 5);
        const w = Math.max(2, (amt / maxCat) * 130);
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.roundedRect(120, y, w, 7, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.text(`$${amt.toFixed(2)}`, 120 + w + 3, y + 5);
        y += 11;
      });
      if (cats.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120);
        doc.text("Sin gastos registrados.", 18, y + 4);
      }

      const slugSafe = (race.title || "carrera").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      doc.save(`Informe_Financiero_${slugSafe}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? `No se pudo generar el PDF: ${e.message}` : "No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  }

  const saldoTone = (stats?.saldo ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-mist">Carrera</span>
          <select
            value={raceId}
            onChange={(e) => setRaceId(e.target.value)}
            className="h-11 w-full rounded-xl border border-hairline bg-carbon px-3 text-snow outline-none focus:border-stryd/60"
          >
            {races.length === 0 && <option value="">Sin carreras</option>}
            {races.map((r) => (
              <option key={r.id} value={r.id}>{r.title} — {String(r.date).slice(0, 10)}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={openAdd} disabled={!raceId}>Registrar pago saliente</Button>
          <Button size="sm" variant="outline" onClick={() => void exportPDF()} disabled={exporting || (!expenses.length && (stats?.recaudado ?? 0) === 0)}>
            {exporting ? "Generando…" : "Informe PDF"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Recaudación Neta</p>
          <p className="font-display mt-1 text-2xl font-black text-emerald-400">{money(stats?.recaudado ?? 0)}</p>
          <p className="mt-1 text-xs text-mist">{stats?.confirmados ?? 0} confirmados · {stats?.pendientes ?? 0} pendientes</p>
        </Card>
        <Card className="border-l-4 border-l-stryd p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Pagos Salientes (enviados)</p>
          <p className="font-display mt-1 text-2xl font-black text-snow">{money(stats?.salientes ?? 0)}</p>
          <p className="mt-1 text-xs text-mist">{expenses.length} registros · {grouped.length} días</p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mist">Saldo del Servicio</p>
          <p className={`font-display mt-1 text-2xl font-black ${saldoTone}`}>{money(stats?.saldo ?? 0)}</p>
          <p className="mt-1 truncate text-xs text-mist">{race?.title ?? "—"}</p>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-mist">Cargando…</p>
        ) : grouped.length === 0 ? (
          <p className="p-6 text-center text-sm text-mist">No hay pagos salientes registrados para esta carrera</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left font-mono text-[10px] uppercase tracking-widest text-mist">
                  <th className="px-4 py-3">Día</th>
                  <th className="px-3 py-3">Referencia</th>
                  <th className="px-3 py-3">Beneficiario</th>
                  <th className="px-3 py-3">Método</th>
                  <th className="px-3 py-3">Comprobante</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {grouped.flatMap((g) => [
                  ...g.items.map((e, i) => (
                    <tr key={e.id} className="border-b border-hairline/60 hover:bg-white/5">
                      <td className="px-4 py-2 text-xs text-mist">{i === 0 ? g.day : ""}</td>
                      <td className="px-3 py-2 text-snow">{e.title}</td>
                      <td className="px-3 py-2 text-fog">{e.beneficiary || "—"}</td>
                      <td className="px-3 py-2 text-fog">{e.method}</td>
                      <td className="px-3 py-2 text-fog">{e.reference || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{money(e.amount)}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(e)} className="mr-2 text-xs text-stryd hover:underline">Editar</button>
                        <button onClick={() => setToDelete(e)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                      </td>
                    </tr>
                  )),
                  <tr key={`sub-${g.day}`} className="border-b border-hairline bg-white/[0.03]">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-fog">Subtotal {g.day}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{money(g.total)}</td>
                    <td />
                  </tr>,
                ])}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => !saving && setDialogOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl border border-hairline bg-carbon p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-snow">{editing ? "Editar" : "Registrar"} pago saliente</h3>
              <Badge tone="neutral">{race?.title ?? ""}</Badge>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-mist">Referencia (concepto) *</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-mist">Beneficiario</span>
                  <input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-mist">Monto (USD) *</span>
                  <input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 font-mono text-snow outline-none focus:border-stryd/60" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-mist">Fecha del pago *</span>
                  <input type="date" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-mist">Método</span>
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60">
                    {EXPENSE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-mist">Categoría de gasto</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60">
                  <option value="">Sin categoría</option>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-mist">Nº comprobante / orden</span>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-mist">Notas</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-hairline bg-abyss px-3 py-2 text-snow outline-none focus:border-stryd/60" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar pago saliente"
        description={toDelete ? `¿Eliminar "${toDelete.title}" (${money(toDelete.amount)}) del registro financiero?` : ""}
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
      />
    </section>
  );
}
