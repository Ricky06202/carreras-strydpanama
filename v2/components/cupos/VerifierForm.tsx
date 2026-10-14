"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputCls =
  "h-11 w-full rounded-lg border border-hairline bg-abyss px-3 font-mono text-sm text-snow outline-none focus:border-stryd/60";

/** Verificador publico: pega id del cupo, direccion del cNFT, firma o codigo. */
export function VerifierForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    setBusy(true);
    router.push(`/verificar/${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label className="flex-1">
        <span className="sr-only">Cupo a verificar</span>
        <input
          className={inputCls}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ID del cupo, dirección del cNFT, firma o código (SPY-…)"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <Button type="submit" size="md" disabled={busy || !q.trim()} className="sm:w-40">
        {busy ? "Verificando…" : "Verificar"}
      </Button>
    </form>
  );
}
