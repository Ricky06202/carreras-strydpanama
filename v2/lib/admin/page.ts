import { redirect } from "next/navigation";
import { isAdmin } from "./session";

/** Para páginas server: redirige al login de admin si no hay sesión. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
