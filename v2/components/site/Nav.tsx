"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/carreras", label: "Carreras" },
  { href: "/resultados", label: "Resultados" },
  { href: "/atletas", label: "Atletas" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-void/70 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-1.5 font-display text-base font-bold tracking-tight" onClick={() => setOpen(false)}>
          <span className="text-snow">STRYD</span>
          <span className="text-stryd">PANAMA</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "text-snow"
                  : "text-mist hover:text-snow"
              }`}
            >
              {(pathname === l.href || pathname.startsWith(l.href + "/")) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-full bg-stryd-dim"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Button size="sm" variant="outline" asChild>
            <Link href="/mi-portal">Mi portal</Link>
          </Button>
        </div>

        <button
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-hairline md:hidden"
        >
          <motion.span animate={open ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }} className="block h-0.5 w-5 bg-snow" />
          <motion.span animate={open ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }} className="block h-0.5 w-5 bg-snow" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-hairline bg-abyss md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((l, i) => (
                <motion.div key={l.href} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="block py-2.5 text-fog active:text-stryd">
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <Button asChild variant="primary" size="lg" className="mt-3 w-full">
                <Link href="/mi-portal">Mi portal</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
