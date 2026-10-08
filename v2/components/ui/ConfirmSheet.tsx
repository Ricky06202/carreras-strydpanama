"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./Button";

type ConfirmSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Si lanza error, el sheet se queda abierto y muestra el mensaje. */
  onConfirm: () => Promise<void>;
};

/**
 * Confirmación mobile-first: bottom sheet en móvil, centrado en desktop.
 * Toda acción destructiva o de dinero pasa por aquí.
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
}: ConfirmSheetProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-150 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 80, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="w-full max-w-md rounded-t-3xl border border-hairline bg-carbon p-6 shadow-card sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <h2 className={`font-display text-lg font-bold ${danger ? "text-red-300" : "text-snow"}`}>{title}</h2>
            {description && <div className="mt-2 text-sm leading-relaxed text-fog">{description}</div>}
            {children && <div className="mt-4">{children}</div>}
            {err && (
              <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {err}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close} disabled={busy} className="sm:min-w-28">
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={() => void run()}
                disabled={busy}
                aria-busy={busy}
                className="w-full sm:w-auto sm:min-w-36"
              >
                {busy ? "Procesando…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
