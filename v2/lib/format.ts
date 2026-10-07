import type { RaceStatus } from "@/lib/db/queries";

export function formatDateEs(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `B/. ${v.toFixed(2)}`;
}

export const STATUS_META: Record<RaceStatus, { label: string; dot: "live" | "idle" }> = {
  accepting: { label: "Inscripciones abiertas", dot: "live" },
  upcoming: { label: "Próximamente", dot: "idle" },
  active: { label: "Carrera en curso", dot: "live" },
  closed: { label: "Inscripciones cerradas", dot: "idle" },
  finished: { label: "Finalizada", dot: "idle" },
};

export function raceImageUrl(rel: string | null | undefined): string | null {
  if (!rel) return null;
  if (rel.startsWith("http")) return rel;
  if (rel.startsWith("/api/images/")) return `https://carreras.strydpanama.com${rel}`;
  return rel;
}

export function formatRaceTime(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const m = hhmm.match(/^(\d{1,2})[:h](\d{2})?\s*(am|pm)?/i);
  if (!m) return hhmm;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const pm = (m[3] || "").toLowerCase() === "pm";
  if (pm && h < 12) h += 12;
  const ampm = h >= 12 ? "p.m." : "a.m.";
  return `${String(h).padStart(2, "0")}:${min} ${ampm}`;
}
