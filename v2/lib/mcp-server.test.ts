import { describe, expect, test } from "bun:test";
import { handleMcp, handleOAuth, oauthMetadata, type McpContext, type McpTool } from "./mcp-server";

const accessToken = "a".repeat(64);

function context(scope: string, tools: McpTool[]): McpContext {
  const token = {
    token_hash: "unused",
    access_expires: Date.now() + 60_000,
    scope,
    resource: "https://rs-connect.test/mcp",
    account_id: "admin@example.test",
  };
  return {
    db: {
      prepare(sql: string) {
        return {
          bind() {
            return {
              first: async () => sql.includes("mcp_clients")
                ? { client_id: "client-test", client_name: "ChatGPT", redirect_uris: JSON.stringify(["https://chatgpt.com/redirect"]) }
                : token,
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
        };
      },
    },
    appName: "RS Connect",
    scopes: ["carreras:read", "carreras:write", "comibox:read", "comibox:write"],
    accountId: "admin@example.test",
    tools,
    checkAccount: async () => true,
  };
}

function callRequest() {
  return new Request("https://rs-connect.test/mcp", {
    method: "POST",
    headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 1,
      params: { name: "crear", arguments: {} },
    }),
  });
}

describe("permisos MCP de RS Connect", () => {
  test("un token de lectura no puede llamar una herramienta de escritura", async () => {
    let called = false;
    const writeTool: McpTool = {
      name: "crear",
      description: "Crea un registro",
      scopes: ["carreras:write"],
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async run() { called = true; return { ok: true }; },
    };
    const ctx = context("carreras:read", [writeTool]);
    const response = await handleMcp(callRequest(), ctx);
    const body = await response.json() as { error?: { code: number } };
    expect(body.error?.code).toBe(-32003);
    expect(called).toBe(false);
  });

  test("un token de lectura puede usar la herramienta concedida y pasa el actor OAuth", async () => {
    let actor = "";
    const readTool: McpTool = {
      name: "crear",
      description: "Consulta un registro",
      scopes: ["carreras:read"],
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async run(_db, _args, accountId) { actor = accountId; return { ok: true }; },
    };
    const ctx = context("carreras:read", [readTool]);
    const response = await handleMcp(callRequest(), ctx);
    const body = await response.json() as { result?: { structuredContent?: { ok?: boolean } } };
    expect(body.result?.structuredContent?.ok).toBe(true);
    expect(actor).toBe("admin@example.test");
  });

  test("publica los cuatro permisos en metadata OAuth", async () => {
    const ctx = context("carreras:read", []);
    const req = new Request("https://rs-connect.test/.well-known/oauth-authorization-server");
    const response = oauthMetadata(req, ctx, "authorization");
    const body = await response.json() as { scopes_supported: string[] };
    expect(body.scopes_supported).toEqual(["carreras:read", "carreras:write", "comibox:read", "comibox:write"]);
  });

  test("el consentimiento muestra solo los ámbitos solicitados y rechaza ámbitos desconocidos", async () => {
    const ctx = context("carreras:read", []);
    const params = new URLSearchParams({
      client_id: "client-test",
      redirect_uri: "https://chatgpt.com/redirect",
      code_challenge: "c".repeat(43),
      code_challenge_method: "S256",
      response_type: "code",
      resource: "https://rs-connect.test/mcp",
      scope: "comibox:read carreras:read",
    });
    const response = await handleOAuth(new Request("https://rs-connect.test/oauth/authorize?" + params), ctx, "authorize");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Consultar carreras e inscripciones");
    expect(html).toContain("Consultar boxeadores e informes de Comibox");
    expect(html).not.toContain("Crear boxeadores en Comibox");

    params.set("scope", "carreras:delete");
    const rejected = await handleOAuth(new Request("https://rs-connect.test/oauth/authorize?" + params), ctx, "authorize");
    expect(rejected.status).toBe(400);
  });
});
