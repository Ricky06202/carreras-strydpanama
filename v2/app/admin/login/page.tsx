import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <section className="bg-void flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-mist">Panel interno</p>
        <h1 className="font-display mt-2 text-center text-3xl font-bold text-snow">
          STRYD <span className="text-stryd">ADMIN</span>
        </h1>
        <AdminLoginForm />
      </div>
    </section>
  );
}
