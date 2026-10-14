"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    RSQR?: {
      svg: (text: string, opts?: { size?: number; margin?: number; ecl?: string; dark?: string; light?: string }) => string;
      makeMatrix: (text: string, opts?: Record<string, unknown>) => unknown;
      version: string;
    };
  }
}

/**
 * QR generado EN EL CLIENTE con el generador propio del sitio (sin CDN externo,
 * el mismo verificado en rsanjur.com). El valor es la URL publica del cupo.
 */
export function CupoQr({ value, size = 220, dark = "#000000", light = "#ffffff" }: { value: string; size?: number; dark?: string; light?: string }) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!window.RSQR) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "/qr-client.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("no se pudo cargar el generador QR"));
            document.head.appendChild(s);
          });
        }
        if (cancelled) return;
        const api = window.RSQR;
        if (!api) throw new Error("RSQR ausente");
        setSvg(api.svg(value, { size, margin: 2, ecl: "M", dark, light }));
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [value, size, dark, light]);

  if (failed) {
    return (
      <p className="text-xs text-mist">
        No se pudo dibujar el QR. Abre <span className="font-mono text-snow">{value}</span> en el navegador.
      </p>
    );
  }
  if (!svg) {
    return <div className="grid h-[220px] w-[220px] place-items-center rounded-xl bg-white/5 text-xs text-mist">Generando QR…</div>;
  }
  return (
    <div
      className="rounded-xl bg-white p-2"
      // El generador propio produce SVG sin scripts; se inyecta como markup.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
