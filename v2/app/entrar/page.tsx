import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRunner } from "@/lib/auth/session";
import { AuthForm } from "@/components/account/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar — Mi portal" };

export default async function LoginPage() {
  if (await getRunner()) redirect("/mi-portal");
  return (
    <section className="bg-void min-h-dvh px-4 pb-16 pt-24">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-3xl font-bold text-snow">Mi portal</h1>
        <p className="mt-2 text-sm text-mist">
          Consulta tus inscripciones, dorsales y paga lo que quede pendiente.
        </p>
        <AuthForm />
      </div>
    </section>
  );
}
