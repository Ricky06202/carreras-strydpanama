import { env } from "cloudflare:workers";

const BASE_URL = "https://apipagosbg.bgeneral.cloud";

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function yappyEnv() {
  const merchantId = env.YAPPY_MERCHANT_ID as string | undefined;
  const secret = env.YAPPY_SECRET_KEY as string | undefined;
  const urlDomain = env.YAPPY_URL_DOMAIN as string | undefined;
  if (!merchantId || !secret || !urlDomain) {
    throw new Error("Faltan variables de entorno de Yappy (YAPPY_MERCHANT_ID, YAPPY_SECRET_KEY, YAPPY_URL_DOMAIN)");
  }
  return { merchantId, secret, urlDomain };
}

async function getMerchantToken(): Promise<string> {
  const { merchantId, secret, urlDomain } = yappyEnv();
  const payload = JSON.stringify({ merchantId, urlDomain });
  const signature = await hmacSign(payload, secret);
  const res = await fetch(`${BASE_URL}/payments/validate/merchant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: signature },
    body: payload,
  });
  const data = (await res.json()) as { token?: string; access_token?: string; body?: { token?: string } };
  const token = data.token || data.access_token || data.body?.token;
  if (!res.ok || !token) throw new Error(`Yappy auth error ${res.status}: ${JSON.stringify(data)}`);
  return token.trim();
}

export interface YappyPaymentResult {
  transactionId: string;
  token: string;
  documentName: string;
}

// Crea la orden en Yappy. El orderId debe ir SIN guiones y max 15 chars.
export async function createYappyPayment(
  orderId: string,
  total: number,
  aliasYappy: string,
): Promise<YappyPaymentResult> {
  const { merchantId, urlDomain } = yappyEnv();
  const token = await getMerchantToken();
  const baseUrl = urlDomain.includes("://") ? urlDomain : `https://${urlDomain}`;
  const totalStr = total.toFixed(2);
  const payloadObj = {
    merchantId,
    orderId: orderId.replace(/-/g, "").slice(0, 15),
    domain: baseUrl,
    aliasYappy,
    paymentDate: Date.now(),
    subtotal: totalStr,
    taxes: "0.00",
    discount: "0.00",
    total: totalStr,
    ipnUrl: `${baseUrl.replace(/\/$/, "")}/api/yappy/webhook`,
  };
  const res = await fetch(`${BASE_URL}/payments/payment-wc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(payloadObj),
  });
  const data = (await res.json()) as { transactionId?: string; token?: string; documentName?: string; body?: { transactionId?: string; token?: string; documentName?: string } };
  const body = data.body ?? data;
  if (!res.ok || !body.transactionId) {
    throw new Error(`Yappy payment error ${res.status}: ${JSON.stringify(data)}`);
  }
  return {
    transactionId: body.transactionId,
    token: body.token ?? "",
    documentName: body.documentName ?? aliasYappy,
  };
}
