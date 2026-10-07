import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRunner } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const runner = await getRunner();
  if (!runner) redirect("/entrar");

  return (
    <section className="bg-void min-h-dvh px-4 pb-20 pt-24">
      <div className="mx-auto w-full max-w-md">
        <Link href="/mi-portal" className="font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
          ← Mi portal
        </Link>
        <h1 className="font-display mt-3 text-3xl font-bold text-snow">Mi perfil</h1>
        <p className="mt-1 text-sm text-mist">
          Usamos estos datos para inscripciones rápidas: completando tu perfil, llenar el formulario toma segundos.
        </p>
        <ProfileForm
          initial={{
            firstName: runner.firstName,
            lastName: runner.lastName,
            phone: runner.phone ?? "",
            bio: runner.bio ?? "",
            instagram: runner.instagram ?? "",
          }}
        />
      </div>
    </section>
  );
}
