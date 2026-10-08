"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type ToastKind = "success" | "error" | "info";
export type ToastMsg = { id: number; kind: ToastKind; text: string };

type Listener = (t: ToastMsg) => void;
const listeners = new Set<Listener>();
let seq = 0;

function emit(kind: ToastKind, text: string) {
  const t: ToastMsg = { id: ++seq, kind, text };
  for (const l of listeners) l(t);
}

/**.toast global — úsalo desde cualquier client component: toast.success("Guardado") */
export const toast = {
  success: (text: string) => emit("success", text),
  error: (text: string) => emit("error", text),
  info: (text: string) => emit("info", text),
};

const styles: Record<ToastKind, string> = {
  success: "border-emerald-500/40 bg-emerald-950/90 text-emerald-200",
  error: "border-red-500/40 bg-red-950/90 text-red-200",
  info: "border-hairline bg-carbon/95 text-snow",
};

const icons: Record<ToastKind, string> = { success: "✓", error: "✕", info: "i" };

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const onToast = (t: ToastMsg) => {
      setItems((cur) => [...cur.slice(-2), t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 px-4"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium shadow-card backdrop-blur-xl ${styles[t.kind]}`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                t.kind === "success" ? "bg-emerald-400 text-emerald-950" : t.kind === "error" ? "bg-red-400 text-red-950" : "bg-white/15 text-snow"
              }`}
            >
              {icons[t.kind]}
            </span>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
