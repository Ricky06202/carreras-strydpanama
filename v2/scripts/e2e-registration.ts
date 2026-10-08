/**
 * E2E del flujo público de inscripción + rutas SEO.
 *
 * Uso:
 *   terminal A: bun run dev      (workerd local en http://localhost:5173)
 *   terminal B: bun run e2e      (o E2E_BASE=https://staging... bun scripts/e2e-registration.ts)
 *
 * No toca Yappy (requiere credenciales reales): usa método "transferencia".
 */
const BASE = process.env.E2E_BASE ?? "http://localhost:5173";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, extra = ""): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${extra ? ` → ${extra}` : ""}`);
  }
}

async function j(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const jsonHeaders = { "content-type": "application/json" };

async function main(): Promise<void> {
  console.log(`E2E inscripción → ${BASE}\n`);

  // 1) Salud + seed de desarrollo si hace falta
  const health = await j("/api/health");
  ok("GET /api/health responde ok", health.status === 200 && health.body?.ok === true, JSON.stringify(health.body));
  if ((health.body?.races ?? 0) === 0) {
    const seed = await j("/api/setup-dev", { method: "POST" });
    ok("POST /api/setup-dev (seed local)", seed.status < 500, `status ${seed.status}`);
  }

  // 2) Encontrar carrera accepting con modalidad
  const q = await j("/api/dev-query", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      sql: "SELECT r.id, r.slug, d.id AS distance_id FROM races r JOIN race_distances d ON d.race_id = r.id WHERE r.status = 'accepting' LIMIT 1",
    }),
  });
  const race = q.body?.results?.[0] as { slug: string; distance_id: string } | undefined;
  ok("hay una carrera accepting con modalidad", !!race, JSON.stringify(q.body ?? {}).slice(0, 140));
  if (!race) return finish();

  // 3) Inscripción válida → preinscrito pendiente
  const stamp = String(Date.now()).slice(-8);
  const payload = {
    slug: race.slug,
    firstName: "E2E",
    lastName: `Prueba${stamp.slice(-4)}`,
    email: `e2e+${stamp}@example.com`,
    phone: "61234567",
    cedula: `8-${stamp.slice(0, 4)}-${stamp.slice(4, 8)}`,
    birthDate: "1995-06-15",
    gender: "masculino",
    distanceId: race.distance_id,
    termsAccepted: true,
    privacyAccepted: true,
    adultOrGuardian: true,
    method: "transferencia",
  };
  const reg = await j("/api/inscripciones", { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
  ok("POST /api/inscripciones válida → 201", reg.status === 201, JSON.stringify(reg.body ?? {}).slice(0, 200));
  ok("trae confirmationCode y monto", !!reg.body?.confirmationCode && typeof reg.body?.amount === "number");
  ok("estado preinscrito + pago pendiente", reg.body?.status === "preinscrito" && reg.body?.paymentStatus === "pendiente");

  // 4) Consulta pública de estado (la que sondea el wizard)
  const st = await j(`/api/inscripciones/${reg.body?.registrationId ?? "x"}`);
  ok("GET /api/inscripciones/:id → 200 con código", st.status === 200 && !!st.body?.confirmationCode, `status ${st.status}`);

  // 5) Rechazos server-side
  const bad = await j("/api/inscripciones", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ ...payload, email: "sin-arroba", cedula: "mala", termsAccepted: false }),
  });
  ok("POST inválida → 422 con fields", bad.status === 422 && !!bad.body?.fields, `status ${bad.status}`);

  const noTerms = await j("/api/inscripciones", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ ...payload, email: `e2e2+${stamp}@example.com`, termsAccepted: false }),
  });
  ok("sin aceptar términos → 422", noTerms.status === 422, `status ${noTerms.status}`);

  const noPrivacy = await j("/api/inscripciones", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ ...payload, email: `e2e3+${stamp}@example.com`, privacyAccepted: false }),
  });
  ok("sin aceptar aviso de privacidad → 422", noPrivacy.status === 422, `status ${noPrivacy.status}`);

  // 6) SEO: robots, sitemap, lang, título
  const homeRes = await fetch(`${BASE}/`);
  const home = await homeRes.text();
  ok("GET / 200", homeRes.status === 200);
  ok('lang="es-PA"', home.includes('lang="es-PA"'));
  ok("title de Stryd Panamá", home.includes("Stryd Panam"));
  ok("skip link accesible", home.includes("Saltar al contenido"));

  const robotsRes = await fetch(`${BASE}/robots.txt`);
  const robots = await robotsRes.text();
  ok("robots.txt 200 con sitemap", robotsRes.status === 200 && robots.includes("sitemap.xml"), robots.slice(0, 60));

  const smRes = await fetch(`${BASE}/sitemap.xml`);
  const sm = await smRes.text();
  ok("sitemap.xml 200 con /carreras", smRes.status === 200 && sm.includes("/carreras"), sm.slice(0, 60));

  const admRes = await fetch(`${BASE}/admin`, { redirect: "follow" });
  const adm = await admRes.text();
  ok("admin lleva meta robots noindex", adm.includes("noindex"), `status ${admRes.status}`);

  finish();
}

function finish(): void {
  console.log(`\n${pass} pasan · ${fail} fallan`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E murió:", e instanceof Error ? e.message : e);
  process.exit(2);
});
