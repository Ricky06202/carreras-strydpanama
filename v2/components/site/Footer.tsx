import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-abyss">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 md:flex-row">
        <p className="font-mono text-xs tracking-widest text-mist uppercase">
          Stryd Panama
        </p>
        <div className="flex gap-6 text-sm text-mist">
          <Link href="/terminos" className="transition-colors hover:text-stryd">
            Términos
          </Link>
          <Link href="/privacidad" className="transition-colors hover:text-stryd">
            Privacidad
          </Link>
          <a href="https://instagram.com" className="transition-colors hover:text-stryd">
            Instagram
          </a>
          <a href="https://facebook.com" className="transition-colors hover:text-stryd">
            Facebook
          </a>
        </div>
        <p className="font-mono text-xs text-mist">
          © {new Date().getFullYear()} Stryd Panama · hecho por{" "}
          <a href="https://rsanjur.com" target="_blank" rel="noopener" className="inline-flex items-center gap-2.5 rounded-lg border border-current/15 bg-current/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:bg-current/[0.08]"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-white"><svg width="18" height="18" viewBox="0 0 512 512" aria-hidden="true"><text x="256" y="340" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="252" fontWeight="800" letterSpacing="-8" fill="#0B1220">RS</text><rect x="196" y="380" width="120" height="26" rx="13" fill="#06B6D4"/></svg></span><span className="text-left text-[11px] leading-[1.15] opacity-60">hecho por<span className="block text-[12px] font-semibold tracking-tight opacity-100">rsanjur.com</span></span></a>
        </p>
      </div>
    </footer>
  );
}
