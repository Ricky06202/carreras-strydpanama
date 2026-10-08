import { NextResponse } from "next/server";
import { authUrl, googleConfig, randomState } from "@/lib/admin/google";

// Login admin con Google OAuth (authorization code). Sin contraseña maestra:
// la lista blanca vive en settings.admin_emails. Fail-closed sin credenciales.
// OJO vinext: cookies().set() NO llega al navegador desde un route handler; la
// cookie de estado se adjunta SIEMPRE a la respuesta.
export async function GET(req: Request) {
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(new URL("/admin/login?error=oauth", req.url));
  const state = randomState();
  const secure = new URL(req.url).protocol === "https:";
  const redirectUri = new URL("/api/admin/callback", req.url).toString();
  const res = NextResponse.redirect(authUrl(cfg, redirectUri, state));
  res.cookies.set("stryd2_oauth", state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/admin",
    maxAge: 600,
  });
  return res;
}
