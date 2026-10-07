"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr(((await res.json()) as { error?: string }).error ?? "Error");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-mist">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="h-13 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25"
          />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !password}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
