"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const field =
  "h-13 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";
const label = "mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-mist";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", cedula: "", password: "" });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFatal(null);
    setErrors({});
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await res.json()) as { error?: string; fields?: Record<string, string> };
      if (!res.ok) {
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
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-hairline bg-void p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setFatal(null); setErrors({}); }}
            className={`h-10 rounded-full text-sm font-semibold transition ${
              mode === m ? "bg-stryd text-black" : "text-mist hover:text-snow"
            }`}
          >
            {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {mode === "signup" && (
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
              <label className={label}>Cédula</label>
              <input className={field} inputMode="numeric" value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value.replace(/\D/g, "").slice(0, 15) })} placeholder="81234567" autoComplete="off" />
              {errors.cedula && <p className="mt-1.5 text-sm text-red-400">{errors.cedula}</p>}
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input className={field} type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="6123-4567" autoComplete="tel" />
              {errors.phone && <p className="mt-1.5 text-sm text-red-400">{errors.phone}</p>}
            </div>
          </>
        )}
        <div>
          <label className={label}>Correo</label>
          <input className={field} type="email" inputMode="email" value={f.email} onChange={set("email")} placeholder="tu@correo.com" autoComplete="email" required />
          {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>}
        </div>
        <div>
          <label className={label}>Contraseña</label>
          <input className={field} type="password" value={f.password} onChange={set("password")} placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "••••••••"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          {errors.password && <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>}
        </div>

        {fatal && <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{fatal}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta y entrar"}
        </Button>

        {mode === "signup" && (
          <p className="text-center text-xs text-mist">
            Al crear tu cuenta, tus inscripciones previas hechas con este correo se vinculan automáticamente.
          </p>
        )}
      </form>
    </Card>
  );
}
