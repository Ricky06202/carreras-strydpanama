"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCedula, phoneDigits } from "@/lib/cedula";

function cedulaInput(v: string): string {
  const f = formatCedula(v);
  if (f) return f;
  return v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 11);
}

const field =
  "h-13 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";
const label = "mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-mist";

// Alta y vinculacion de la cuenta cuando el corredor entra con RS ID.
// No hay contraseña: la unica puerta es el RS ID.
export function AltaRsIdForm({ ticket, email }: { ticket: string; email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"alta" | "vincular">("alta");
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ firstName: "", lastName: "", cedula: "", phone: "", birthDate: "" });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFatal(null);
    setErrors({});
    try {
      const url = mode === "alta" ? "/api/auth/alta" : "/api/auth/vincular";
      const body =
        mode === "alta"
          ? { ticket, firstName: f.firstName, lastName: f.lastName, cedula: f.cedula, phone: f.phone, birthDate: f.birthDate }
          : { ticket, cedula: f.cedula, birthDate: f.birthDate };
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json()) as { error?: string; fields?: Record<string, string>; vincular?: boolean };
      if (!res.ok) {
        // La cedula ya existe con otro correo: pasar a la prueba de propiedad.
        if (j.vincular) {
          setMode("vincular");
          setFatal(null);
          setErrors({});
          return;
        }
        setFatal(j.error ?? "Algo salió mal");
        setErrors(j.fields ?? {});
        return;
      }
      router.push("/mi-portal");
      router.refresh();
    } catch {
      setFatal("Sin conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <p className="rounded-xl border border-stryd/30 bg-carbon p-3 text-sm text-fog">
        {mode === "alta" ? (
          <>
            Tu correo <span className="font-semibold text-snow">{email}</span> quedó verificado con tu RS ID.
            Solo completa tus datos para crear la cuenta.
          </>
        ) : (
          <>
            Esa cédula ya tiene una cuenta con otro correo. Confirma que es tuya con tu{" "}
            <span className="font-semibold text-snow">cédula y fecha de nacimiento</span> y unimos las dos.
          </>
        )}
      </p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
        {mode === "alta" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Nombre(s)</label>
                <input className={field} value={f.firstName} onChange={set("firstName")} autoComplete="given-name" placeholder="Maria" />
                {errors.firstName && <p className="mt-1.5 text-sm text-red-400">{errors.firstName}</p>}
              </div>
              <div>
                <label className={label}>Apellidos</label>
                <input className={field} value={f.lastName} onChange={set("lastName")} autoComplete="family-name" placeholder="González" />
                {errors.lastName && <p className="mt-1.5 text-sm text-red-400">{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input className={field} type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: phoneDigits(e.target.value).slice(0, 10) })} placeholder="61234567" autoComplete="tel" />
              {errors.phone && <p className="mt-1.5 text-sm text-red-400">{errors.phone}</p>}
            </div>
          </>
        )}

        <div>
          <label className={label}>Cédula</label>
          <input
            className={field}
            inputMode="text"
            value={f.cedula}
            onChange={(e) => setF({ ...f, cedula: cedulaInput(e.target.value) })}
            placeholder="8-1234-567"
            autoCapitalize="characters"
            autoComplete="off"
            required
          />
          {errors.cedula && <p className="mt-1.5 text-sm text-red-400">{errors.cedula}</p>}
        </div>

        <div>
          <label className={label}>Fecha de nacimiento{mode === "alta" ? " (opcional)" : ""}</label>
          <input className={field} type="date" value={f.birthDate} onChange={set("birthDate")} required={mode === "vincular"} />
          {errors.birthDate && <p className="mt-1.5 text-sm text-red-400">{errors.birthDate}</p>}
        </div>

        {fatal && <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{fatal}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Un momento…" : mode === "alta" ? "Crear cuenta y entrar" : "Confirmar y entrar"}
        </Button>

        {mode === "vincular" && (
          <button type="button" onClick={() => { setMode("alta"); setFatal(null); setErrors({}); }} className="text-center text-xs text-mist underline underline-offset-4">
            Esa cédula no es mía / quiero crear mi cuenta igual
          </button>
        )}
      </form>
    </Card>
  );
}
