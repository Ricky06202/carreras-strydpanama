"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  src: string;
  alt: string;
};

export function PosterViewer({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar el afiche: ${alt}`}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-card border border-hairline bg-steel shadow-card transition-colors hover:border-stryd/40"
      >
        <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
          <img
            aria-hidden
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
          />
          <img
            src={src}
            alt={alt}
            className="relative h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02] sm:p-3"
          />
          <span className="absolute bottom-3 right-3 z-[1] rounded-full border border-hairline bg-black/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-mist backdrop-blur transition-colors group-hover:border-stryd/50 group-hover:text-stryd">
            Ampliar +
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={alt}
          >
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              src={src}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-auto max-w-full rounded-card object-contain shadow-glow-soft"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar afiche"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-carbon/80 text-lg text-mist backdrop-blur transition-colors hover:border-stryd/50 hover:text-stryd"
            >
              ✕
            </button>
            <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
              Esc para cerrar
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
