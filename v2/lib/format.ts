import type { RaceStatus } from "@/lib/db/queries";

export function formatDateEs(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Fecha compacta para tablas: "03 mar 2025". */
export function formatDateShortEs(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
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
  // Servimos desde nuestro worker (bucket propio -> fallback al legacy); evita el
  // dominio pub-*.r2.dev que esta limitado a ~1000 peticiones/dia.
  const key = rel.split("/").pop();
  if (!key) return null;
  return `/api/images/${key}`;
}

/** Foto de perfil: URL absoluta tal cual, o clave del bucket servida por /api/images/. */
export function athletePhotoUrl(rel: string | null | undefined): string | null {
  const value = (rel ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  const key = value.split("/").pop();
  return key ? `/api/images/${encodeURIComponent(key)}` : null;
}

/** URL de perfil de Instagram a partir del dato crudo ("@usuario", "usuario" o URL). */
export function instagramUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@+/, "").replace(/\/+$/, "");
  return handle ? `https://instagram.com/${encodeURIComponent(handle)}` : null;
}

/** Tiempo de carrera en formato hh:mm:ss a partir de segundos. */
export function formatFinishTime(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec) || sec < 0) return "—";
  const total = Math.trunc(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
