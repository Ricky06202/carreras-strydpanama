"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { toast } from "@/components/ui/Toast";
import type { AdminTeamItem, AdminTeamStats, OrphanTeamName } from "@/lib/admin/teams";

const STATUS_CHIPS = [
  { v: "todas", label: "Todas" },
  { v: "pending", label: "Pendientes" },
  { v: "approved", label: "Aprobadas" },
];

type ListData = {
  items: AdminTeamItem[];
  total: number;
  page: number;
  stats: AdminTeamStats;
  orphans: OrphanTeamName[];
};

export function EquiposBoard() {
  const [data, setData] = useState<ListData | null>(null);
  const [items, setItems] = useState<AdminTeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todas");
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [orphanBusy, setOrphanBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminTeamItem | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async (opts: { q?: string; status?: string; page: number; append?: boolean }) => {
    if (opts.append) setLoadingMore(true);
    else setLoading(true);
    const sp = new URLSearchParams();
    const qq = (opts.q ?? "").trim();
    if (qq) sp.set("q", qq);
    if (opts.status && opts.status !== "todas") sp.set("status", opts.status);
    if (opts.page > 1) sp.set("page", String(opts.page));
    try {
      const res = await fetch(`/api/admin/equipos?${sp.toString()}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error((d as { error?: string })?.error ?? "Error al cargar");
      const list = d as ListData;
      setData(list);
      setItems((prev) => (opts.append ? [...prev, ...list.items] : list.items));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Carga inicial + búsqueda con debounce + cambio de filtro.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void refresh({ q, status, page: 1 });
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, refresh]);

  async function act(id: string, action: "approve" | "unapprove" | "rename", payload?: unknown) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/equipos/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string })?.error ?? "No se pudo completar");
      toast.success((d as { message?: string }).message ?? "Listo");
      await refresh({ q, status, page });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusyId(null);
    }
  }

  function saveRename() {
    if (!editing) return;
    const name = editing.name.trim();
    if (name.length < 2) {
      toast.error("Mínimo 2 caracteres");
      return;
    }
    const id = editing.id;
    setEditing(null);
    void act(id, "rename", { name });
  }

  async function createTeam(name: string, approve: boolean, viaOrphan = false) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Mínimo 2 caracteres");
      return;
    }
    if (viaOrphan) setOrphanBusy(trimmed);
    else setCreating(true);
    try {
      const res = await fetch("/api/admin/equipos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, approve }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string })?.error ?? "No se pudo crear");
      if (!viaOrphan) setNewName("");
      toast.success((d as { message?: string }).message ?? "Equipo creado");
      setPage(1);
      await refresh({ q, status, page: 1 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCreating(false);
      setOrphanBusy(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-28">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-snow">Equipos</h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Directorio global</p>
      </div>

      {data && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Equipos" value={data.stats.total} tone="text-snow" />
          <MiniStat label="Aprobados" value={data.stats.approved} tone="text-emerald-400" />
          <MiniStat label="Pendientes" value={data.stats.pending} tone="text-stryd" />
          <MiniStat label="Insc. c/ equipo" value={data.stats.linkedRegs} tone="text-snow" />
        </div>
      )}

      {/* Registro manual */}
      <Card className="mt-4 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Registrar equipo</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-xs text-mist">Nombre</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 80))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createTeam(newName, true);
              }}
              placeholder="Ej. Los Pájaros SC"
              className="h-10 w-full rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60"
            />
          </label>
          <Button disabled={creating || newName.trim().length < 2} onClick={() => void createTeam(newName, true)} className="h-10 w-full sm:w-auto">
            {creating ? "Creando…" : "Crear y aprobar"}
          </Button>
        </div>
      </Card>

      {/* Nombres usados en inscripciones sin equipo registrado */}
      {data && data.orphans.length > 0 && (
        <Card className="mt-4 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">
            Nombres en inscripciones sin equipo ({data.stats.orphanNames})
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {data.orphans.map((o) => (
              <div key={o.name} className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-sm text-snow">{o.name}</p>
                <p className="font-mono text-xs text-mist">{o.members}</p>
                <Button size="sm" variant="outline" disabled={orphanBusy === o.name} onClick={() => void createTeam(o.name, true, true)}>
                  {orphanBusy === o.name ? "…" : "Crear y aprobar"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Búsqueda + filtros */}
      <div className="mt-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre…"
          className="h-11 w-full rounded-xl border border-hairline bg-carbon px-4 text-snow placeholder-mist/60 outline-none transition-all focus:border-stryd/60"
        />
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {STATUS_CHIPS.map((c) => (
            <button
              key={c.v}
              type="button"
              onClick={() => setStatus(c.v)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                status === c.v ? "bg-stryd font-semibold text-black" : "bg-carbon text-fog ring-1 ring-inset ring-hairline hover:text-snow"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-mist">
        {loading ? "Cargando…" : `${items.length} de ${data?.total ?? 0} equipos`}
      </p>

      {err && (
        <Card className="mt-3 flex items-center justify-between p-4">
          <p className="text-sm text-red-400">{err}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh({ q, status, page })}>
            Reintentar
          </Button>
        </Card>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card border border-hairline bg-carbon" />)}
        {!loading && items.length === 0 && !err && (
          <Card className="p-8 text-center">
            <p className="font-display text-snow">Sin equipos por aquí</p>
            <p className="mt-1 text-sm text-mist">Registra uno arriba o cambia el filtro.</p>
          </Card>
        )}
        {!loading &&
          items.map((t) => (
            <Card key={t.id} className="px-4 py-3">
              {editing?.id === t.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: t.id, name: e.target.value.slice(0, 80) })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-hairline bg-abyss px-3 text-snow outline-none focus:border-stryd/60"
                  />
                  <Button size="sm" disabled={busyId === t.id} onClick={saveRename}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] font-semibold text-snow">{t.name}</p>
                    <p className="mt-0.5 text-xs text-mist">
                      {t.members} inscrito{t.members === 1 ? "" : "s"} · desde {t.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <Badge tone={t.isApproved ? "success" : "stryd"}>{t.isApproved ? "Aprobado" : "Pendiente"}</Badge>
                  <button
                    type="button"
                    aria-label={`Renombrar ${t.name}`}
                    onClick={() => setEditing({ id: t.id, name: t.name })}
                    className="shrink-0 rounded-lg p-2 text-mist transition hover:text-snow"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M11.2 2.3l2.5 2.5-8.2 8.2-3.2.7.7-3.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {busyId === t.id ? (
                    <span className="shrink-0 px-1 font-mono text-xs text-mist">…</span>
                  ) : t.isApproved ? (
                    <Button size="sm" variant="outline" onClick={() => void act(t.id, "unapprove")} className="shrink-0">
                      Desaprobar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void act(t.id, "approve")} className="shrink-0">
                      Aprobar
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label={`Eliminar ${t.name}`}
                    onClick={() => setConfirmDel(t)}
                    className="shrink-0 rounded-lg p-2 text-mist transition hover:bg-red-950/50 hover:text-red-400"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M2 4h12M5.5 4V2.5A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.5 1.5V4m2 0v9A1.5 1.5 0 0 1 11 14.5H5A1.5 1.5 0 0 1 3.5 13V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )}
            </Card>
          ))}
      </div>

      {data && !loading && items.length < data.total && (
        <Button
          variant="outline"
          className="mt-3 w-full"
          disabled={loadingMore}
          onClick={() => {
            setPage((p) => p + 1);
            void refresh({ q, status, page: page + 1, append: true });
          }}
        >
          {loadingMore ? "Cargando…" : `Cargar más (${data.total - items.length} restantes)`}
        </Button>
      )}

      <ConfirmSheet
        open={confirmDel !== null}
        onClose={() => setConfirmDel(null)}
        title="Eliminar equipo"
        description={
          <>
            Se eliminará <span className="font-mono text-snow">{confirmDel?.name}</span> del directorio.{" "}
            {(confirmDel?.members ?? 0) > 0 ? (
              <>
                Sus <strong className="text-snow">{confirmDel?.members} inscripción(es)</strong> conservan el nombre como texto y
                volverán a la lista de pendientes de vincular.
              </>
            ) : (
              "No tiene inscripciones activas vinculadas."
            )}
          </>
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (!confirmDel) return;
          const res = await fetch(`/api/admin/equipos/${confirmDel.id}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "delete" }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((d as { error?: string })?.error ?? "No se pudo eliminar");
          toast.success((d as { message?: string }).message ?? "Equipo eliminado");
          setConfirmDel(null);
          await refresh({ q, status, page });
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
