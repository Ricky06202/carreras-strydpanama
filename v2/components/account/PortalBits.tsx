"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { formatCedula, phoneDigits } from "@/lib/cedula";

export type RegCardData = {
  id: string;
  name: string;
  raceSlug: string;
  raceTitle: string;
  raceDate: string;
  distanceTitle: string | null;
  categoryTitle: string | null;
  status: string;
  statusUi: { label: string; tone: "stryd" | "neutral" | "success" | "danger" };
  paymentStatus: string;
  bibNumber: number | null;
  confirmationCode: string;
  phone: string | null;
  shirtSize: string | null;
  teamName: string | null;
  raceAccepting: boolean;
};

const field =
  "h-12 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";

export function RegistrationCard({ data: r }: { data: RegCardData }) {
  const [editing, setEditing] = useState(false);
  const canEdit = r.status !== "anulado" && r.raceAccepting;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/carrera/${r.raceSlug}`} className="font-display text-lg font-bold text-snow hover:text-stryd">
            {r.raceTitle}
          </Link>
          <p className="mt-0.5 text-xs text-mist">
            {r.raceDate} · {r.distanceTitle ?? "—"}{r.categoryTitle ? ` · ${r.categoryTitle}` : ""}
          </p>
        </div>
        <Badge tone={r.statusUi.tone}>{r.statusUi.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat k="Dorsal" v={r.bibNumber != null ? `#${r.bibNumber}` : "—"} big={r.bibNumber != null} />
        <Stat k="Pago" v={r.paymentStatus} />
        <Stat k="Confirmación" v={r.confirmationCode} mono />
        <Stat k="Talla" v={r.shirtSize ?? "—"} />
      </div>

      {r.paymentStatus === "pendiente" && r.status === "preinscrito" && (
        <p className="mt-4 rounded-xl border border-stryd/25 bg-stryd/5 p-3 text-sm text-fog">
          Tu pago sigue <b className="text-stryd">pendiente</b>. Si ya pagaste, compártenos tu comprobante por{" "}
          <a href="https://wa.me/50700000000" target="_blank" rel="noopener" className="underline underline-offset-2">WhatsApp</a>{" "}
          con el código <b className="font-mono">{r.confirmationCode}</b>.
        </p>
      )}

      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Actualizar datos
          </Button>
        </div>
      )}

      <EditDialog open={editing} onClose={() => setEditing(false)} data={r} />
    </Card>
  );
}

function Stat({ k, v, big, mono }: { k: string; v: string; big?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-void px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mist">{k}</p>
      <p className={`mt-0.5 capitalize text-fog ${big ? "font-display text-2xl font-black text-stryd" : mono ? "font-mono text-xs" : "text-sm"}`}>{v}</p>
    </div>
  );
}

function EditDialog({ open, onClose, data }: { open: boolean; onClose: () => void; data: RegCardData }) {
  const router = useRouter();
  const [phone, setPhone] = useState(data.phone ?? "");
  const [shirtSize, setShirtSize] = useState(data.shirtSize ?? "");
  const [teamName, setTeamName] = useState(data.teamName ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canChangeSize = data.paymentStatus !== "pagado";

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/inscripciones/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          shirtSize: canChangeSize && shirtSize ? shirtSize : undefined,
          teamName: teamName || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setErr(j.error ?? "No se pudo guardar");
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Actualizar inscripción">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-mist">Teléfono</p>
          <input className={field} inputMode="tel" value={phone} onChange={(e) => setPhone(phoneDigits(e.target.value).slice(0, 10))} placeholder="61234567" />
        </div>
        {canChangeSize && (
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-mist">Talla de camiseta</p>
            <div className="flex flex-wrap gap-2">
              {["", "S", "M", "L", "XL", "XXL"].map((s) => (
                <button
                  key={s || "none"}
                  type="button"
                  onClick={() => setShirtSize(s)}
                  className={`h-11 min-w-11 rounded-xl border px-4 font-mono text-sm transition ${
                    shirtSize === s ? "border-stryd bg-stryd/10 font-bold text-stryd" : "border-hairline bg-carbon text-mist hover:text-snow"
                  }`}
                >
                  {s || "Sin talla"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-mist">Equipo</p>
          <input className={field} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Opcional" />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </Dialog>
  );
}

export function PortalActions({ hasCedula }: { hasCedula: boolean }) {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cedula }),
      });
      const j = (await res.json()) as { claimed?: number; error?: string };
      setMsg(j.error ?? (j.claimed ? `${j.claimed} inscripción(es) vinculada(s)` : "No encontramos inscripciones con esa cédula"));
      if (j.claimed) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrar");
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-6">
      {!hasCedula && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">¿Te inscribiste antes de crear cuenta?</p>
          <div className="flex gap-2">
            <input className={field} inputMode="numeric" value={cedula} onChange={(e) => { const f = formatCedula(e.target.value); setCedula(f ?? e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 11)); }} placeholder="Ej. 8-1234-567" autoCapitalize="characters" />
            <Button variant="secondary" size="lg" disabled={!cedula || busy} onClick={() => void claim()}>
              {busy ? "…" : "Vincular"}
            </Button>
          </div>
          {msg && <p className="text-sm text-mist">{msg}</p>}
        </div>
      )}
      <div className={`flex items-center justify-between ${hasCedula ? "" : "mt-4 border-t border-hairline pt-4"}`}>
        <button onClick={() => void logout()} className="font-mono text-xs uppercase tracking-widest text-mist hover:text-red-400">
          Cerrar sesión
        </button>
      </div>
    </Card>
  );
}
