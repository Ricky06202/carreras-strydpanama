import { athletePhotoUrl } from "@/lib/format";

const sizes = {
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl sm:h-32 sm:w-32 sm:text-4xl",
} as const;

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return (first + second).toUpperCase() || "?";
}

/** Color estable derivado del nombre: mismo atleta, mismo tono en toda la app. */
function tone(fullName: string): { backgroundColor: string } {
  let hash = 0;
  for (const ch of fullName) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 360;
  return { backgroundColor: `hsl(${hash} 48% 30%)` };
}

type Props = {
  name: string;
  photoUrl: string | null;
  size?: keyof typeof sizes;
};

/** Foto del atleta o, si no tiene, inicial en circulo con color derivado del nombre. */
export function AthleteAvatar({ name, photoUrl, size = "md" }: Props) {
  const src = athletePhotoUrl(photoUrl);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Foto de ${name}`}
        loading="lazy"
        className={`${sizes[size]} shrink-0 rounded-full border border-hairline object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={tone(name)}
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full font-display font-bold text-snow ring-1 ring-inset ring-white/10`}
    >
      {initials(name)}
    </div>
  );
}
