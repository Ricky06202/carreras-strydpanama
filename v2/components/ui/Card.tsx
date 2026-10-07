import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ interactive = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-hairline bg-carbon shadow-card ${
        interactive ? "transition-all duration-300 hover:border-stryd/40 hover:shadow-glow-soft" : ""
      } ${className}`}
      {...props}
    />
  );
}
