"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const sections = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/carreras", label: "Carreras" },
  { href: "/admin/inscripciones", label: "Inscripciones" },
  { href: "/admin/codigos", label: "Códigos" },
  { href: "/admin/equipos", label: "Equipos" },
  { href: "/admin/timing", label: "Timing" },
];

export function AdminBar() {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/admin/login";

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-abyss/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/admin" className="font-display shrink-0 text-base font-bold text-snow">
          STRYD <span className="text-stryd">ADMIN</span>
        </Link>
        {!onLogin && (
          <>
            <nav className="scrollbar-none flex flex-1 gap-1 overflow-x-auto">
              {sections.map((s) => {
                const active = s.href === "/admin" ? pathname === "/admin" : pathname.startsWith(s.href);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
                      active ? "bg-stryd-dim font-semibold text-stryd" : "text-mist hover:text-snow"
                    }`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={() => void logout()} className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-mist hover:text-red-400">
              Salir
            </button>
          </>
        )}
      </div>
    </header>
  );
}
