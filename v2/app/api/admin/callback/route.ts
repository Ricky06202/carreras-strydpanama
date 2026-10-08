import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchVerifiedEmail, googleConfig, isAllowedAdmin, timingSafeEqStr } from "@/lib/admin/google";
import { startAdminSession } from "@/lib/admin/session";

// Callback de Google: valida state (CSRF), intercambia el code, chequea la
// whitelist (settings.admin_emails) y emite la sesión admin revocable.
// Las cookies SIEMPRE viajan adjuntas a la respuesta (ver nota en login/route).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secure = url.protocol === "https:";
  const clearState = (res: NextResponse) =>
    res.cookies.set("stryd2_oauth", "", { httpOnly: true, sameSite: "lax", secure, path: "/api/admin", maxAge: 0 });

  const deny = (why: string) => {
    const res = NextResponse.redirect(new URL(`/admin/login?error=${why}`, url));
    clearState(res);
    return res;
  };

  const cfg = googleConfig();
  if (!cfg) return deny("oauth");
  if (url.searchParams.get("error")) return deny("google");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return deny("google");

  const expected = (await cookies()).get("stryd2_oauth")?.value ?? "";
  if (!expected || !timingSafeEqStr(expected, state)) return deny("estado");

  const email = await fetchVerifiedEmail(cfg, code, new URL("/api/admin/callback", url).toString());
  if (!email) return deny("google");
  if (!(await isAllowedAdmin(email))) return deny("whitelist");

  const res = NextResponse.redirect(new URL("/admin", url));
  clearState(res);
  await startAdminSession(res, secure);
  return res;
}
