"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { phoneDigits } from "@/lib/cedula";

const field =
  "h-13 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";
const label = "mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-mist";

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string; bio: string; instagram: string } }) {
  const [f, setF] = useState(initial);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      setMsg(res.ok ? { ok: true, text: "Perfil guardado ✓" } : { ok: false, text: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pw),
      });
      const j = (await res.json()) as { error?: string };
      setMsg(res.ok ? { ok: true, text: "Contraseña actualizada ✓" } : { ok: false, text: j.error ?? "No se pudo cambiar" });
      if (res.ok) setPw({ current: "", next: "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nombre(s)</label>
            <input className={field} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          </div>
          <div>
            <label className={label}>Apellidos</label>
            <input className={field} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input className={field} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: phoneDigits(e.target.value).slice(0, 10) })} placeholder="61234567" />
        </div>
        <div>
          <label className={label}>Instagram</label>
          <input className={field} value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value.replace(/^@/, "") })} placeholder="tu.usuario" />
        </div>
        <div>
          <label className={label}>Sobre ti (opcional)</label>
          <textarea className={`${field} h-28 py-3`} maxLength={500} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Club, marcas personales…" />
        </div>
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar perfil"}
        </Button>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <p className="font-display text-base font-semibold text-snow">Cambiar contraseña</p>
        <div>
          <label className={label}>Actual</label>
          <input className={field} type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
        </div>
        <div>
          <label className={label}>Nueva (mínimo 8)</label>
          <input className={field} type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
        </div>
        <Button variant="secondary" size="lg" className="w-full" disabled={busy || !pw.current || pw.next.length < 8} onClick={() => void changePassword()}>
          Cambiar contraseña
        </Button>
      </Card>

      {msg && (
        <p className={`text-center text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
      )}
    </div>
  );
}
