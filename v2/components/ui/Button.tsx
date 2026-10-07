"use client";

import { cloneElement, isValidElement } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-stryd text-black font-semibold hover:bg-stryd-soft hover:shadow-glow active:bg-stryd-deep",
  secondary: "bg-steel text-snow hover:bg-carbon hover:ring-1 hover:ring-white/10",
  ghost: "bg-transparent text-fog hover:text-snow hover:bg-white/5",
  outline:
    "bg-transparent text-snow ring-1 ring-inset ring-hairline hover:ring-stryd/60 hover:text-stryd",
  danger: "bg-red-950/60 text-red-300 ring-1 ring-inset ring-red-500/30 hover:bg-red-900/60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display tracking-wide transition-colors duration-200 select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className = "",
  children,
  ...props
}: ButtonProps & { asChild?: boolean }) {
  const styles = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return cloneElement(child, { className: `${base} ${variants[variant]} ${sizes[size]} ${className}` });
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={styles}
      {...props}
    >
      {children}
    </motion.button>
  );
}
