/* MCP Streamable HTTP + OAuth 2.1 para integraciones externas.
 * Todas las herramientas privadas requieren consentimiento OAuth con PKCE S256.
 * No usar las cookies del panel ni la llave global del asistente como token MCP.
 */
export type McpTool = {
  name: string;
  description: string;
  scopes: string[];
  idempotentHint?: boolean;
  inputSchema: { type: "object"; properties: Record<string, unknown>; additionalProperties: false; required?: string[] };
  run: (db: any, args: Record<string, unknown>, accountId: string) => Promise<unknown>;
};

export type McpContext = {
  db: any;
  appName: string;
  scopes: string[];
  accountId: string | null;
  tools: McpTool[];
  checkAccount?: (accountId: string) => Promise<boolean>;
};

const encoder = new TextEncoder();
const OAUTH_COOKIE = "rs_mcp_consent";
const TOKEN_SECONDS = 3600;
const REFRESH_SECONDS = 30 * 86400;

function output(body: unknown, status = 200, additional: Record<string,string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status, headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff", ...additional
    }
  });
}
function error(code: string, description: string, status = 400): Response {
  return output({ error: code, error_description: description }, status);
}
function site(request: Request): string {
  return new URL(request.url).origin;
}
function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
function asBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function digest(value: string, base64 = false): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return base64 ? asBase64Url(bytes) : Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function clean(value: unknown, max = 200): string {
  return typeof value === "string" && value.length <= max ? value : "";
}
function safe(value: string): string {
  return value.replace(/[&<>"']/g, s => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[s] || s));
}
function httpsUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" && !!u.hostname && !u.username && !u.password && !u.hash;
  } catch { return false; }
}
function metadataUrl(req: Request): string {
  return site(req) + "/.well-known/oauth-protected-resource";
}
function unauth(req: Request, scope: string, id: unknown): Response {
  const challenge = 'Bearer resource_metadata="' + metadataUrl(req) + '", error="insufficient_scope", error_description="Conecta tu cuenta en el panel de la aplicación", scope="' + scope + '"';
  return output({
    jsonrpc:"2.0", id,
    result:{
      isError:true,
      content:[{type:"text",text:"Debes autorizar este complemento desde tu cuenta administrativa."}],
      _meta:{"mcp/www_authenticate":[challenge]}
    }
  }, 200, {"www-authenticate":challenge});
}

export function oauthMetadata(req: Request, context: McpContext, kind: "resource" | "authorization"): Response {
  const origin = site(req);
  if (kind === "resource") return output({
    resource: origin + "/mcp",
    resource_name: context.appName,
    authorization_servers: [origin],
    scopes_supported: context.scopes,
    bearer_methods_supported: ["header"]
  });
  return output({
    issuer: origin,
    authorization_endpoint: origin + "/oauth/authorize",
    token_endpoint: origin + "/oauth/token",
    registration_endpoint: origin + "/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: context.scopes,
    client_id_metadata_document_supported: false
  });
}

type Client = { client_id: string; client_name: string; redirect_uris: string };
async function clientFor(db: any, id: string): Promise<Client | null> {
  return db.prepare("SELECT client_id, client_name, redirect_uris FROM mcp_clients WHERE client_id = ?").bind(id).first();
}
function redirected(uri: string, params: Record<string,string>): Response {
  const u = new URL(uri);
  for (const [k,v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { location: u.toString(), "cache-control": "no-store" } });
}
function readParams(req: Request): Promise<URLSearchParams> {
  return req.text().then(text => {
    if (text.length > 8192) throw Error("body_too_large");
    return new URLSearchParams(text);
  });
}
function consentFields(p: URLSearchParams, ctx: McpContext, expectedResource: string) {
  const clientId = clean(p.get("client_id"), 100);
  const redirectUri = clean(p.get("redirect_uri"), 1500);
  const challenge = clean(p.get("code_challenge"), 200);
  const state = clean(p.get("state"), 1500);
  const resource = clean(p.get("resource"), 1500);
  const requestedScopes = (clean(p.get("scope"), 200) || ctx.scopes[0] || "").trim().split(/\s+/).filter(Boolean);
  const supported = new Set(ctx.scopes);
  const scope = [...new Set(requestedScopes)].sort().join(" ");
  if (!clientId || !httpsUri(redirectUri) || !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
      p.get("code_challenge_method") !== "S256" || p.get("response_type") !== "code" ||
      !scope || requestedScopes.length !== scope.split(" ").length || requestedScopes.some((value) => !supported.has(value)) || resource !== expectedResource) {
    return null;
  }
  return { clientId, redirectUri, challenge, state, scope };
}

function scopeList(scope: unknown): string[] {
  return typeof scope === "string" ? scope.trim().split(/\s+/).filter(Boolean) : [];
}

export async function handleOAuth(req: Request, ctx: McpContext, path: string): Promise<Response> {
  const origin = site(req);
  const db = ctx.db;
  if (!db) return error("server_error", "Base de datos no disponible.", 503);
  try {
    if (path === "register" && req.method === "POST") {
      const body = await req.text();
      if (body.length > 4096) return error("invalid_client_metadata", "Solicitud demasiado grande.", 413);
      let obj: Record<string, any>;
      try { obj = JSON.parse(body); } catch { return error("invalid_client_metadata", "JSON inválido."); }
      const uris = obj.redirect_uris;
      if (!Array.isArray(uris) || uris.length < 1 || uris.length > 5 ||
          !uris.every((u: unknown) => typeof u === "string" && u.length <= 1500 && httpsUri(u))) {
        return error("invalid_redirect_uri", "Las URL de retorno deben utilizar HTTPS.");
      }
      if (obj.token_endpoint_auth_method && obj.token_endpoint_auth_method !== "none") {
        return error("invalid_client_metadata", "Solo clientes públicos PKCE.");
      }
      if (obj.grant_types && (!Array.isArray(obj.grant_types) || !obj.grant_types.includes("authorization_code"))) {
        return error("invalid_client_metadata", "Se requiere authorization_code.");
      }
      const id = crypto.randomUUID();
      const name = clean(obj.client_name, 120).trim() || "Cliente MCP";
      await db.prepare("INSERT INTO mcp_clients (client_id, client_name, redirect_uris, created_at) VALUES (?,?,?,?)")
        .bind(id, name, JSON.stringify(uris), Date.now()).run();
      return output({
        client_id: id, client_name: name, redirect_uris: uris,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"]
      }, 201);
    }
    if (path === "authorize" && (req.method === "GET" || req.method === "POST")) {
      const p = req.method === "GET" ? new URL(req.url).searchParams : await readParams(req);
      const fields = consentFields(p, ctx, origin + "/mcp");
      if (!fields) return error("invalid_request", "Parámetros OAuth o PKCE inválidos.");
      const client = await clientFor(db, fields.clientId);
      let uris: string[] = [];
      try { uris = JSON.parse(client?.redirect_uris || "[]"); } catch {}
      if (!client || !uris.includes(fields.redirectUri)) return error("invalid_client", "Cliente o URL no registrados.", 400);
      if (!ctx.accountId || (ctx.checkAccount && !(await ctx.checkAccount(ctx.accountId)))) {
        return new Response("Inicia sesión en el panel administrativo y vuelve a autorizar desde ChatGPT.", {
          status: 401, headers: { "content-type": "text/plain; charset=utf-8", "cache-control":"no-store" }
        });
      }
      if (req.method === "GET") {
        const csrf = randomSecret();
        const labels: Record<string, string> = {
          "carreras:read": "Consultar carreras e inscripciones",
          "carreras:write": "Previsualizar e importar inscripciones (requiere aprobación explícita)",
          "comibox:read": "Consultar boxeadores e informes de Comibox",
          "comibox:write": "Crear boxeadores en Comibox"
        };
        const permisos = fields.scope.split(" ").map((value) => "<li>" + safe(labels[value] ?? value) + "</li>").join("");
        const body = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<meta name="referrer" content="no-referrer"><title>Autorizar ' + safe(ctx.appName) + '</title>' +
          '<body style="font:16px system-ui;max-width:560px;margin:10vh auto;padding:24px;background:#10151e;color:#fff">' +
          '<h1>Conectar ' + safe(ctx.appName) + '</h1><p><strong>' + safe(client.client_name) + '</strong> solicita estos permisos:</p><ul>' + permisos + '</ul>' +
          '<p>Las herramientas no pueden borrar registros. Puedes revocar el acceso desde Integraciones.</p>' +
          '<form method="post" action="/oauth/authorize">' +
          Array.from(p.entries()).map(([k,v]) => '<input type="hidden" name="' + safe(k) + '" value="' + safe(v) + '">').join("") +
          '<input type="hidden" name="csrf" value="' + csrf + '">' +
          '<button name="decision" value="allow" style="padding:14px;background:#16a34a;color:white;border:0;border-radius:8px">Autorizar acceso</button>' +
          '<button name="decision" value="deny" style="padding:14px;margin-left:10px">Cancelar</button></form></body></html>';
        return new Response(body, { headers: {
          "content-type":"text/html; charset=utf-8", "cache-control":"no-store", "x-frame-options":"DENY",
          "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
          "set-cookie": OAUTH_COOKIE + "=" + csrf + "; Path=/oauth/authorize; HttpOnly; SameSite=Lax; Max-Age=600" + (origin.startsWith("https:") ? "; Secure" : "")
        }});
      }
      const requestOrigin = req.headers.get("origin");
      if (requestOrigin && requestOrigin !== origin) return error("access_denied", "Origen no permitido.", 403);
      const cookieValue = (req.headers.get("cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(OAUTH_COOKIE + "="))?.split("=")[1] || "";
      if (!cookieValue || !same(cookieValue, clean(p.get("csrf"), 128))) return error("access_denied", "Confirmación caducada.", 403);
      if (p.get("decision") !== "allow") return redirected(fields.redirectUri, { error:"access_denied", state:fields.state });
      const code = randomSecret();
      await db.prepare("INSERT INTO mcp_codes (code_hash, client_id, redirect_uri, code_challenge, account_id, scope, resource, expires_at) VALUES (?,?,?,?,?,?,?,?)")
        .bind(await digest(code), fields.clientId, fields.redirectUri, fields.challenge, ctx.accountId, fields.scope, origin + "/mcp", Date.now() + 300000).run();
      return redirected(fields.redirectUri, { code, state:fields.state });
    }
    if (path === "token" && req.method === "POST") {
      const p = await readParams(req);
      const clientId = clean(p.get("client_id"), 100);
      const type = p.get("grant_type");
      if (!clientId || !(await clientFor(db, clientId))) return error("invalid_client", "Cliente no registrado.", 401);
      let accountId = "";
      let scope = ctx.scopes[0] || "";
      if (type === "authorization_code") {
        const code = clean(p.get("code"), 200);
        const verifier = clean(p.get("code_verifier"), 200);
        const redirectUri = clean(p.get("redirect_uri"), 1500);
        if (!code || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return error("invalid_grant", "Código o PKCE inválidos.");
        const hash = await digest(code);
        const row = await db.prepare("SELECT * FROM mcp_codes WHERE code_hash=? AND client_id=?").bind(hash, clientId).first();
        if (!row || row.expires_at <= Date.now() || row.redirect_uri !== redirectUri ||
            !same(await digest(verifier, true), row.code_challenge) || row.resource !== origin + "/mcp" || p.get("resource") !== row.resource) return error("invalid_grant", "Código expirado o inválido.");
        const used = await db.prepare("DELETE FROM mcp_codes WHERE code_hash=? AND client_id=? AND expires_at>?")
          .bind(hash, clientId, Date.now()).run();
        if (Number(used?.meta?.changes ?? 0) !== 1) return error("invalid_grant", "Código ya utilizado.");
        accountId = row.account_id;
        scope = row.scope;
      } else if (type === "refresh_token") {
        const refresh = clean(p.get("refresh_token"), 200);
        const row = await db.prepare("SELECT * FROM mcp_tokens WHERE refresh_hash=? AND client_id=?")
          .bind(await digest(refresh), clientId).first();
        if (!row || row.refresh_expires <= Date.now() || row.resource !== origin + "/mcp" || (p.get("resource") && p.get("resource") !== row.resource)) return error("invalid_grant", "Renovación no válida.");
        const used = await db.prepare("DELETE FROM mcp_tokens WHERE refresh_hash=? AND client_id=?")
          .bind(await digest(refresh), clientId).run();
        if (Number(used?.meta?.changes ?? 0) !== 1) return error("invalid_grant", "Renovación ya utilizada.");
        accountId = row.account_id;
        scope = row.scope;
      } else return error("unsupported_grant_type", "Grant no permitido.");
      if (ctx.checkAccount && !(await ctx.checkAccount(accountId))) return error("invalid_grant", "Acceso administrativo revocado.");
      const access = randomSecret();
      const refresh = randomSecret();
      const now = Date.now();
      await db.prepare("INSERT INTO mcp_tokens (token_hash, refresh_hash, client_id, account_id, scope, resource, access_expires, refresh_expires) VALUES (?,?,?,?,?,?,?,?)")
        .bind(await digest(access), await digest(refresh), clientId, accountId, scope, origin + "/mcp",
          now + TOKEN_SECONDS * 1000, now + REFRESH_SECONDS * 1000).run();
      return output({ access_token:access, refresh_token:refresh, token_type:"Bearer", expires_in:TOKEN_SECONDS, scope });
    }
    return error("invalid_request", "Ruta o método no admitido.", 404);
  } catch {
    return error("server_error", "Integración no disponible. Revisa las migraciones de MCP.", 503);
  }
}

export async function connectedClients(db: any, accountId: string): Promise<number> {
  if (!db || !accountId) return 0;
  try {
    const r = await db.prepare("SELECT COUNT(*) AS n FROM mcp_tokens WHERE account_id=? AND refresh_expires>?")
      .bind(accountId, Date.now()).first();
    return Number(r?.n || 0);
  } catch { return 0; }
}

export async function revokeClient(db: any, accountId: string): Promise<void> {
  await db.prepare("DELETE FROM mcp_tokens WHERE account_id=?").bind(accountId).run();
  await db.prepare("DELETE FROM mcp_codes WHERE account_id=?").bind(accountId).run();
}

function rpc(id: unknown, result: unknown, status = 200): Response {
  return output({ jsonrpc:"2.0", id, result }, status, { "mcp-protocol-version":"2025-06-18" });
}
function rpcError(id: unknown, code: number, message: string): Response {
  return output({ jsonrpc:"2.0", id, error:{ code, message } }, 200);
}

export async function handleMcp(req: Request, ctx: McpContext): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status:405, headers:{allow:"POST","cache-control":"no-store"} });
  const origin = req.headers.get("origin");
  if (origin && origin !== site(req)) return error("invalid_request", "Origen no permitido.", 403);
  const raw = await req.text();
  if (raw.length > 16384) return error("invalid_request", "Solicitud demasiado grande.", 413);
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return rpcError(null, -32700, "JSON inválido"); }
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string")
    return rpcError(msg?.id ?? null, -32600, "Solicitud inválida");
  if (!Object.prototype.hasOwnProperty.call(msg, "id")) return new Response(null, { status:202,headers:{"cache-control":"no-store"} });
  if (msg.method === "initialize") return rpc(msg.id, {
    protocolVersion:"2025-06-18", capabilities:{ tools:{listChanged:false} },
    serverInfo:{ name: ctx.appName, version:"1.0.0" },
    instructions:"Respeta los permisos mostrados por herramienta. Nunca inventes datos ni confirmes una importación sin aprobación explícita de la persona usuaria."
  });
  if (msg.method === "ping") return rpc(msg.id, {});
  if (msg.method === "tools/list") return rpc(msg.id, { tools: ctx.tools.map(tool => ({
    name:tool.name, description:tool.description, inputSchema:tool.inputSchema,
    annotations:{ readOnlyHint:!tool.scopes.some((scope) => scope.endsWith(":write")), destructiveHint:false, idempotentHint:tool.idempotentHint ?? true },
    securitySchemes:[{type:"oauth2", scopes:tool.scopes}],
    _meta:{securitySchemes:[{type:"oauth2", scopes:tool.scopes}]}
  })) });
  if (msg.method !== "tools/call") return rpcError(msg.id, -32601, "Método desconocido");
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(req.headers.get("authorization") || "");
  if (!match || !ctx.db) return unauth(req, ctx.scopes.join(" "), msg.id);
  let token: any;
  try {
    token = await ctx.db.prepare("SELECT * FROM mcp_tokens WHERE token_hash=?").bind(await digest(match[1])).first();
  } catch { return unauth(req, ctx.scopes.join(" "), msg.id); }
  const granted = scopeList(token?.scope);
  if (!token || token.access_expires <= Date.now() || !granted.length || granted.some((value) => !ctx.scopes.includes(value)) || token.resource !== site(req) + "/mcp") return unauth(req, ctx.scopes.join(" "), msg.id);
  if (ctx.checkAccount && !(await ctx.checkAccount(token.account_id))) return unauth(req, ctx.scopes.join(" "), msg.id);
  const tool = ctx.tools.find(x => x.name === msg.params?.name);
  if (!tool) return rpcError(msg.id, -32602, "Herramienta desconocida");
  if (!tool.scopes.every((scope) => granted.includes(scope))) return rpcError(msg.id, -32003, "El token no tiene permiso para esta herramienta.");
  const args = msg.params?.arguments || {};
  if (typeof args !== "object" || Array.isArray(args)) return rpcError(msg.id, -32602, "Argumentos inválidos");
  try {
    const data = await tool.run(ctx.db, args, token.account_id);
    return rpc(msg.id, {
      content:[{type:"text",text:JSON.stringify(data)}],
      structuredContent: data
    });
  } catch {
    return rpc(msg.id, { isError:true, content:[{type:"text",text:"No se pudo consultar el recurso."}] });
  }
}
