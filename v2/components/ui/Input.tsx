"use client";

import { useId, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, id, className = "", ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-fog">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        className={`h-11 w-full rounded-xl border bg-carbon px-4 text-snow placeholder-mist/60 outline-none transition-all duration-200 ring-0 focus:border-stryd/60 focus:shadow-glow-soft ${
          error ? "border-red-500/60" : "border-hairline"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-mist">{hint}</p>
      ) : null}
    </div>
  );
}
