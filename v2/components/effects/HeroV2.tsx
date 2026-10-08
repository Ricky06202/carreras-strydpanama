"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroV2() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div className="tech-grid absolute inset-0" />
      <div className="radial-stryd absolute inset-x-0 bottom-0 h-2/3" />

      <div className="relative mx-auto w-full max-w-6xl px-5">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mb-5 font-mono text-xs tracking-[0.35em] text-stryd uppercase"
        >
          Carreras · Panamá
        </motion.p>

        <h1 className="flex flex-col font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-8xl">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease }}
          >
            STRYD
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease }}
            className="text-stryd"
          >
            PANAMA
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7, ease }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-mist"
        >
          Inscripciones, cronometraje y resultados de las carreras Stryd. Récords personales,
          podium y comunidad, en una sola plataforma.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.7, ease }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Button asChild size="lg">
            <Link href="/carreras">Inscríbete ahora</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/carreras">Ver carreras</Link>
          </Button>
          <Badge tone="stryd">
            <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-stryd" />
            Próxima carrera pronto
          </Badge>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-6 rounded-full border border-hairline p-1"
        >
          <div className="mx-auto h-2 w-1 rounded-full bg-stryd" />
        </motion.div>
      </motion.div>
    </section>
  );
}
