import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDateEs, formatMoney, raceImageUrl, STATUS_META } from "@/lib/format";
import type { PublicRace } from "@/lib/db/queries";

export function RaceCard({ race }: { race: PublicRace }) {
  const img = raceImageUrl(race.imageUrl);
  const status = STATUS_META[race.status];
  const cupos = race.maxParticipants ?? 0;
  const llenos = cupos > 0 && race.confirmedCount >= cupos;

  return (
    <Link
      href={`/carrera/${race.slug}`}
      className="group relative block overflow-hidden rounded-card border border-hairline bg-steel shadow-card transition-all duration-300 hover:border-stryd/40 hover:shadow-glow-soft"
      aria-label={`Ver detalles de ${race.title}`}
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
        {img ? (
          <>
            {/* Fondo difuminado: el afiche se ve completo (contain) y nunca corta */}
            <img
              aria-hidden
              src={img}
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
              loading="lazy"
              alt=""
            />
            <img
              src={img}
              alt={`Afiche oficial de ${race.title}`}
              className="relative h-full w-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.03] sm:p-3"
              loading="lazy"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-end bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,var(--color-stryd-glow),transparent_70%)] p-6">
            <span className="font-display text-6xl font-bold tracking-tight text-white/10">STRYD</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

        <div className="absolute left-4 top-4 z-[2]">
          <Badge tone={race.status === "accepting" ? "stryd" : "neutral"}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status.dot === "live" ? "animate-glow-pulse bg-stryd" : "bg-mist"
              }`}
            />
            {status.label}
          </Badge>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
          <h2 className="font-display text-xl font-bold leading-tight tracking-tight text-snow drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] transition-colors duration-300 group-hover:text-stryd sm:text-2xl">
            {race.title}
          </h2>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-mist">
            {formatDateEs(race.date)}
            {race.location ? ` · ${race.location}` : ""}
            {llenos ? " · lleno" : ""}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-lg font-bold text-stryd">{formatMoney(race.price)}</span>
            <span className="font-mono text-xs text-fog opacity-70 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-stryd">
              Ver afiche →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
