import type { HTMLAttributes } from "react";

type Tone = "stryd" | "neutral" | "success" | "danger";

const tones: Record<Tone, string> = {
  stryd: "bg-stryd-dim text-stryd ring-stryd/30",
  neutral: "bg-white/5 text-fog ring-hairline",
  success: "bg-emerald-950/50 text-emerald-400 ring-emerald-500/30",
  danger: "bg-red-950/50 text-red-400 ring-red-500/30",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs tracking-wide ring-1 ring-inset ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
