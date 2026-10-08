import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb, schema } from "@/lib/db";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

/** Estado mínimo de OAuth: sin credenciales reales el login queda cerrado (fail-closed).
 * En dev el harness de vinext no inyecta vars → fallback de smoke (igual que ADMIN_SECRET antes);
 * en producción (workerd real) import.meta.env.DEV es false y sin vars no hay login posible. */
function isDevRuntime(): boolean {
  return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "development");
}

export function googleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = (env.GOOGLE_CLIENT_ID as string | undefined) ?? "";
  const clientSecret = (env.GOOGLE_CLIENT_SECRET as string | undefined) ?? "";
  if (!clientId || !clientSecret) {
    return isDevRuntime() ? { clientId: "dev-smoke", clientSecret: "dev-smoke" } : null;
  }
  return { clientId, clientSecret };
}

export function randomState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function authUrl(cfg: { clientId: string }, redirectUri: string, state: string): string {
  const u = new URL(AUTH_ENDPOINT);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email");
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export function timingSafeEqStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Intercambia el code por el correo verificado de la sesión de Google. */
export async function fetchVerifiedEmail(
  cfg: { clientId: string; clientSecret: string },
  code: string,
  redirectUri: string,
): Promise<string | null> {
  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return null;
    const tok = (await tokenRes.json()) as { access_token?: string };
    if (!tok.access_token) return null;
    const uiRes = await fetch(USERINFO_ENDPOINT, {
      headers: { authorization: `Bearer ${tok.access_token}` },
    });
    if (!uiRes.ok) return null;
    const ui = (await uiRes.json()) as { email?: string; email_verified?: boolean };
    if (!ui.email || ui.email_verified === false) return null;
    return ui.email.trim().toLowerCase();
  } catch {
    return null; // sin red o Google responde mal → denegado, nunca un 500
  }
}

/**
 * Whitelist de administradores: clave `admin_emails` en settings (coma separada).
 * Sin fila o vacía = nadie entra (fail-closed). Editable sin redeploy.
 */
export async function isAllowedAdmin(email: string): Promise<boolean> {
  let value: string;
  try {
    const row = await getDb()
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "admin_emails"))
      .get();
    value = row?.value ?? "";
  } catch {
    return false; // tabla sin datos de settings → cerrado
  }
  const list = value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
