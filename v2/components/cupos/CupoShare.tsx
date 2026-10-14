"use client";

import { useState } from "react";

type Estado = "idle" | "copiado" | "error" | "compartido";

/**
 * Boton "Compartir" del cupo (client). Usa la hoja nativa del sistema cuando
 * existe y, si no, copia el link. Accesible (AA): foco visible, aria-label y
 * avisos con aria-live.
 */
export function CupoShare({ url, nombre }: { url: string; nombre: string }) {
  const [estado, setEstado] = useState<Estado>("idle");

  async function compartir() {
    const texto = `Mi cupo para ${nombre}: verifícalo en la cadena`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "Mi cupo", text: texto, url });
        setEstado("compartido");
        setTimeout(() => setEstado("idle"), 2500);
        return;
      }
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
      setTimeout(() => setEstado("idle"), 2500);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("idle"), 3000);
    }
  }

  const aviso =
    estado === "copiado" ? "Link copiado" : estado === "compartido" ? "Compartido" : estado === "error" ? "No se pudo compartir" : "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={compartir}
        aria-label={`Compartir el cupo de ${nombre}`}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-stryd px-5 font-display text-sm font-semibold tracking-wide text-black transition-colors hover:bg-stryd-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stryd"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M12 3v12" />
          <path d="m7 8 5-5 5 5" />
        </svg>
        Compartir
      </button>
      <span role="status" aria-live="polite" className="text-sm text-mist">
        {aviso}
      </span>
    </div>
  );
}
