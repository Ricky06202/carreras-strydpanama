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
          <a href="https://instagram.com" className="transition-colors hover:text-stryd">
            Instagram
          </a>
          <a href="https://facebook.com" className="transition-colors hover:text-stryd">
            Facebook
          </a>
        </div>
        <p className="font-mono text-xs text-mist">© {new Date().getFullYear()} Stryd Panama</p>
      </div>
    </footer>
  );
}
