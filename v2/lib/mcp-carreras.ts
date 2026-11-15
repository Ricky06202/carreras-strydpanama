import { env } from "cloudflare:workers";
import { isAllowedAdmin } from "./admin/google";
import { commitRegistrationImport, previewRegistrationImport } from "./rs-connect-import";
import type { McpContext, McpTool } from "./mcp-server";

const SCOPES = ["carreras:read", "carreras:write", "comibox:read", "comibox:write"];
const IMPORT_ROW = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", format: "email" },
    phone: { type: "string" }, cedula: { type: "string" }, birthDate: { type: "string", format: "date" },
    gender: { type: "string", enum: ["masculino", "femenino", "otro"] }, distanceId: { type: "string" },
    participantTypeKey: { type: "string" }, teamName: { type: "string" }, shirtSize: { type: "string", enum: ["S", "M", "L", "XL", "XXL"] },
    paymentMethod: { type: "string", enum: ["transferencia", "efectivo"] }, paymentStatus: { type: "string", enum: ["pendiente", "pagado"] },
    termsAccepted: { type: "boolean", const: true }, privacyAccepted: { type: "boolean", const: true },
    adultOrGuardian: { type: "boolean", const: true }, consentAt: { type: "string", format: "date-time" }
  },
  required: ["firstName", "lastName", "email", "phone", "cedula", "birthDate", "gender", "distanceId", "paymentMethod", "paymentStatus", "termsAccepted", "privacyAccepted", "adultOrGuardian"]
};

function objectArgs(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : fallback;
  return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function sign(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function comiboxRequest(
  accountId: string,
  endpoint: string,
  method = "GET",
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<unknown> {
  const config = env as unknown as Record<string, string | undefined>;
  const base = config.COMIBOX_API_URL ?? "";
  const apiKey = config.COMIBOX_RS_CONNECT_API_KEY ?? "";
  const secret = config.COMIBOX_RS_CONNECT_HMAC_SECRET ?? "";
  let baseUrl: URL;
  try { baseUrl = new URL(base); } catch { throw new Error("La conexión segura con Comibox no está configurada."); }
  if (baseUrl.protocol !== "https:" || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash ||
      apiKey.length < 48 || secret.length < 32 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountId)) {
    throw new Error("La conexión segura con Comibox no está configurada.");
  }
  const url = new URL("/api/asistente/v1" + endpoint, baseUrl.origin);
  const timestamp = String(Date.now());
  const actor = accountId.trim().toLowerCase();
  const serializedBody = body ? JSON.stringify(body) : undefined;
  const bodyHash = await sha256(serializedBody ?? "");
  const contentType = body ? "application/json" : "";
  const signature = await sign(secret, [timestamp, actor, method.toUpperCase(), url.pathname + url.search, bodyHash, contentType, idempotencyKey ?? ""].join("\n"));
  const headers = new Headers({
    authorization: "Bearer " + apiKey,
    "x-rs-connect-actor": actor,
    "x-rs-connect-timestamp": timestamp,
    "x-rs-connect-signature": signature,
    accept: "application/json",
  });
  if (body) headers.set("content-type", contentType);
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  const response = await fetch(url, { method, headers, ...(serializedBody !== undefined ? { body: serializedBody } : {}) });
  let result: Record<string, unknown>;
  try { result = await response.json() as Record<string, unknown>; }
  catch { throw new Error("Comibox devolvió una respuesta inválida."); }
  if (!response.ok) {
    const error = result.error as Record<string, unknown> | undefined;
    const message = typeof error?.message === "string" ? error.message : "Comibox rechazó la solicitud.";
    throw new Error(message);
  }
  return result;
}

const tools: McpTool[] = [
  {
    name: "resumen_carreras",
    description: "Consulta el número de carreras e inscripciones por estado, sin datos personales.",
    scopes: ["carreras:read"],
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(db) {
      const races = await db.prepare("SELECT COUNT(*) AS n FROM races").first();
      const regs = await db.prepare("SELECT status, COUNT(*) AS n FROM registrations GROUP BY status").all();
      return { carreras: races?.n ?? 0, inscripciones_por_estado: regs.results ?? [] };
    }
  },
  {
    name: "listar_carreras",
    description: "Consulta hasta 20 carreras con título, fecha, lugar y estado.",
    scopes: ["carreras:read"],
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(db) {
      const rows = await db.prepare("SELECT id, slug, title, date, location, status FROM races ORDER BY date DESC LIMIT 20").all();
      return { carreras: rows.results ?? [] };
    }
  },
  {
    name: "listar_inscripciones",
    description: "Busca inscripciones de una carrera y devuelve datos administrativos con paginación.",
    scopes: ["carreras:read"],
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        slug: { type: "string" }, status: { type: "string", enum: ["preinscrito", "inscrito", "anulado"] },
        paymentStatus: { type: "string", enum: ["pendiente", "pagado", "reembolsado", "exento"] },
        limit: { type: "integer", minimum: 1, maximum: 50 }, offset: { type: "integer", minimum: 0 }
      },
      required: ["slug"]
    },
    async run(db, args) {
      if (!objectArgs(args, ["slug", "status", "paymentStatus", "limit", "offset"]) || typeof args.slug !== "string" || !args.slug.trim()) {
        return { ok: false, error: "Indica el slug de la carrera y filtros válidos." };
      }
      if (args.status !== undefined && (typeof args.status !== "string" || !["preinscrito", "inscrito", "anulado"].includes(args.status))) {
        return { ok: false, error: "El estado de inscripción no es válido." };
      }
      if (args.paymentStatus !== undefined && (typeof args.paymentStatus !== "string" || !["pendiente", "pagado", "reembolsado", "exento"].includes(args.paymentStatus))) {
        return { ok: false, error: "El estado de pago no es válido." };
      }
      const conditions = ["r.slug = ?"];
      const values: unknown[] = [args.slug.trim()];
      if (typeof args.status === "string" && ["preinscrito", "inscrito", "anulado"].includes(args.status)) {
        conditions.push("g.status = ?"); values.push(args.status);
      }
      if (typeof args.paymentStatus === "string" && ["pendiente", "pagado", "reembolsado", "exento"].includes(args.paymentStatus)) {
        conditions.push("g.payment_status = ?"); values.push(args.paymentStatus);
      }
      const limit = boundedInt(args.limit, 25, 1, 50);
      const offset = boundedInt(args.offset, 0, 0, 100000);
      const where = conditions.join(" AND ");
      const total = await db.prepare("SELECT COUNT(*) AS n FROM registrations g JOIN races r ON r.id = g.race_id WHERE " + where).bind(...values).first();
      const result = await db.prepare(
        "SELECT g.id, g.title, g.first_name, g.last_name, g.email, g.phone, g.cedula, g.birth_date, g.gender, g.status, g.payment_status, g.amount_paid, g.bib_number, d.title AS distance, c.title AS category, g.created_at FROM registrations g JOIN races r ON r.id = g.race_id LEFT JOIN race_distances d ON d.id = g.distance_id LEFT JOIN race_categories c ON c.id = g.category_id WHERE " + where + " ORDER BY g.created_at DESC LIMIT ? OFFSET ?"
      ).bind(...values, limit, offset).all();
      return { total: total?.n ?? 0, limit, offset, inscripciones: result.results ?? [] };
    }
  },
  {
    name: "previsualizar_importacion_inscripciones",
    description: "Valida hasta 30 formularios estructurados y devuelve un resumen sin guardar personas ni documentos. Requiere volver a enviar exactamente los mismos datos al confirmar.",
    scopes: ["carreras:write"],
    idempotentHint: false,
    inputSchema: { type: "object", additionalProperties: false, properties: { slug: { type: "string" }, rows: { type: "array", minItems: 1, maxItems: 30, items: IMPORT_ROW } }, required: ["slug", "rows"] },
    async run(db, args, accountId) {
      return previewRegistrationImport(db, args, accountId);
    }
  },
  {
    name: "confirmar_importacion_inscripciones",
    description: "Crea las inscripciones de una vista previa solo cuando la persona confirma explícitamente el resumen. Las filas pagadas usan el confirmador normal y reciben dorsal y correo.",
    scopes: ["carreras:write"],
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { slug: { type: "string" }, rows: { type: "array", minItems: 1, maxItems: 30, items: IMPORT_ROW }, approvalToken: { type: "string", minLength: 64, maxLength: 64 }, approvedByUser: { type: "boolean", const: true } },
      required: ["slug", "rows", "approvalToken", "approvedByUser"]
    },
    async run(db, args, accountId) {
      return commitRegistrationImport(db, args, accountId);
    }
  },
  {
    name: "buscar_boxeadores_comibox",
    description: "Busca boxeadores existentes en Comibox. Admite nombre, cédula y paginación.",
    scopes: ["comibox:read"],
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { q: { type: "string", maxLength: 100 }, limit: { type: "integer", minimum: 1, maximum: 50 }, offset: { type: "integer", minimum: 0 } }
    },
    async run(_db, args, accountId) {
      if (!objectArgs(args, ["q", "limit", "offset"])) return { ok: false, error: "Hay filtros no permitidos." };
      if (args.q !== undefined && typeof args.q !== "string") return { ok: false, error: "El texto de búsqueda debe ser una cadena." };
      const query = new URLSearchParams();
      if (typeof args.q === "string" && args.q.trim()) query.set("q", args.q.trim().slice(0, 100));
      query.set("limit", String(boundedInt(args.limit, 25, 1, 50)));
      query.set("offset", String(boundedInt(args.offset, 0, 0, 100000)));
      return comiboxRequest(accountId, "/boxeadores?" + query.toString());
    }
  },
  {
    name: "informe_comibox",
    description: "Consulta el informe estructurado de Comibox. Devuelve datos JSON; no genera archivos PDF.",
    scopes: ["comibox:read"],
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { evento_id: { type: "string", maxLength: 100 }, limit: { type: "integer", minimum: 1, maximum: 50 }, offset: { type: "integer", minimum: 0 } }
    },
    async run(_db, args, accountId) {
      if (!objectArgs(args, ["evento_id", "limit", "offset"])) return { ok: false, error: "Hay filtros no permitidos." };
      if (args.evento_id !== undefined && typeof args.evento_id !== "string") return { ok: false, error: "El identificador de evento debe ser una cadena." };
      const query = new URLSearchParams();
      if (typeof args.evento_id === "string" && args.evento_id.trim()) query.set("evento_id", args.evento_id.trim().slice(0, 100));
      query.set("limit", String(boundedInt(args.limit, 25, 1, 50)));
      query.set("offset", String(boundedInt(args.offset, 0, 0, 100000)));
      return comiboxRequest(accountId, "/informes?" + query.toString());
    }
  },
  {
    name: "crear_boxeador_comibox",
    description: "Crea un boxeador en Comibox. Requiere que la persona confirme los datos y proporciona una clave de idempotencia UUID para reintentos.",
    scopes: ["comibox:write"],
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        nombre: { type: "string", minLength: 2, maxLength: 120 }, alias: { type: "string" }, cedula: { type: "string" },
        nacionalidad: { type: "string" }, provincia: { type: "string" }, fecha_nac: { type: "string", format: "date" },
        estatura_cm: { type: "integer" }, peso_lb: { type: "integer" }, guardia: { type: "string" }, division: { type: "string" },
        entrenador: { type: "string" }, gimnasio: { type: "string" }, victorias: { type: "integer" }, derrotas: { type: "integer" },
        empates: { type: "integer" }, victoriasKo: { type: "integer" }, derrotasKo: { type: "integer" },
        idempotencyKey: { type: "string", format: "uuid" }, confirmed_by_user: { type: "boolean", const: true }
      },
      required: ["nombre", "idempotencyKey", "confirmed_by_user"]
    },
    async run(_db, args, accountId) {
      const allowed = ["nombre", "alias", "cedula", "nacionalidad", "provincia", "fecha_nac", "estatura_cm", "peso_lb", "guardia", "division", "entrenador", "gimnasio", "victorias", "derrotas", "empates", "victoriasKo", "derrotasKo", "idempotencyKey", "confirmed_by_user"];
      if (!objectArgs(args, allowed) || args.confirmed_by_user !== true || typeof args.nombre !== "string" ||
          typeof args.idempotencyKey !== "string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(args.idempotencyKey)) {
        return { ok: false, error: "Confirma los datos y proporciona un UUID de idempotencia válido." };
      }
      const body: Record<string, unknown> = { confirmed_by_user: true };
      for (const field of allowed.slice(0, -2)) if (args[field] !== undefined) body[field] = args[field];
      return comiboxRequest(accountId, "/boxeadores", "POST", body, args.idempotencyKey);
    }
  }
];

export function contextoMcpCarreras(accountId: string | null = null): McpContext {
  return {
    db: env.DB,
    appName: "RS Connect — STRYD Panamá",
    scopes: SCOPES,
    accountId,
    tools,
    checkAccount: isAllowedAdmin
  };
}
