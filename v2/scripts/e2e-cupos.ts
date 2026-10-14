/**
 * E2E del flujo de CUPOS DIGITALES (cNFT) + lo que NO debe romperse.
 *
 * Uso:
 *   terminal A: bun run dev      (workerd local en http://localhost:5173)
 *   terminal B: bun scripts/e2e-cupos.ts
 *
 * Cubre los dos modos:
 *   - flag APAGADO  -> la inscripcion funciona igual que hoy (cupo "skipped")
 *   - flag ENCENDIDO-> cupo emitido (mock si no hay tesoreria), /mi-cupo, verificador
 */
export {}; // modulo: aisla los globals de e2e-registration.ts y habilita top-level await

const BASE = process.env.E2E_BASE ?? "http://localhost:5173";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, extra = ""): void {
  if (cond) {
    pass++;
    console.log(`  OK  ${name}`);
  } else {
    fail++;
    console.error(`  X   ${name}${extra ? " -> " + extra : ""}`);
  }
}

async function j(path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function html(path: string): Promise<{ status: number; text: string }> {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, text: await res.text().catch(() => "") };
}

const jsonHeaders = { "content-type": "application/json" };

async function main(): Promise<void> {
  console.log(`E2E cupos -> ${BASE}\n`);

  const health = await j("/api/health");
  ok("GET /api/health responde ok", health.status === 200 && health.body?.ok === true, JSON.stringify(health.body));
  if ((health.body?.races ?? 0) === 0) {
    const seed = await j("/api/setup-dev", { method: "POST" });
    // 501 = no hay seed generado en este entorno (esperado fuera de la maquina con la BD real).
    ok("POST /api/setup-dev (seed local)", seed.status < 500 || seed.status === 501, `status ${seed.status}`);
  }

  const q = await j("/api/dev-query", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      sql: "SELECT r.id, r.slug, d.id AS distance_id FROM races r JOIN race_distances d ON d.race_id = r.id WHERE r.status = 'accepting' LIMIT 1",
    }),
  });
  const race = q.body?.results?.[0] as { id: string; slug: string; distance_id: string } | undefined;
  ok("hay una carrera accepting con modalidad", !!race, JSON.stringify(q.body ?? {}).slice(0, 160));
  if (!race) return finish();

  const stamp = String(Date.now()).slice(-8);
  const payload = {
    slug: race.slug,
    firstName: "Cupo",
    lastName: `E2E${stamp.slice(-4)}`,
    email: `cupo+${stamp}@example.com`,
    phone: "61234567",
    cedula: `9-${stamp.slice(0, 4)}-${stamp.slice(4, 8)}`,
    birthDate: "1995-06-15",
    gender: "masculino",
    distanceId: race.distance_id,
    termsAccepted: true,
    privacyAccepted: true,
    adultOrGuardian: true,
    method: "transferencia",
  };

  // 1) La inscripcion NUNCA depende del cupo.
  const reg = await j("/api/inscripciones", { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
  ok("POST /api/inscripciones -> 201 (sigue funcionando)", reg.status === 201, JSON.stringify(reg.body ?? {}).slice(0, 200));
  const regId = reg.body?.registrationId as string | undefined;
  if (!regId) return finish();

  const st = await j(`/api/inscripciones/${regId}`);
  ok("GET /api/inscripciones/:id -> 200", st.status === 200 && !!st.body?.confirmationCode, `status ${st.status}`);

  // 2) Emision del cupo (dev-only trigger; en prod lo dispara pago/confirmacion).
  const cupo = await j("/api/dev-cupo", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ registrationId: regId }) });
  const emitted = cupo.body?.status === "minted";
  const skipped = cupo.body?.status === "skipped";
  ok("POST /api/dev-cupo responde (minted | skipped)", emitted || skipped, JSON.stringify(cupo.body ?? {}).slice(0, 200));

  if (skipped) {
    console.log(`  i   CNFT_RED apagado (${cupo.body?.reason ?? ""}): modo "igual que hoy".`);
  }

  // 3) Cupo publico (JSON + HTML) siempre disponible.
  const pub = await j(`/api/cupos/${regId}`);
  ok("GET /api/cupos/:id -> 200", pub.status === 200, `status ${pub.status}`);
  ok("el cupo trae carrera + codigo", !!pub.body?.raceTitle && !!pub.body?.confirmationCode);

  const mi = await html(`/mi-cupo/${regId}`);
  ok("GET /mi-cupo/:id -> 200 con datos", mi.status === 200 && mi.text.includes("Mi cupo") && mi.text.includes(reg.body?.confirmationCode ?? "@@"), `status ${mi.status}`);

  // Identidad del cupo + tarjeta OG (lo que se ve al compartir en redes).
  ok("mi-cupo muestra el bloque de identidad", mi.text.includes("Este cupo pertenece a"), "falta el bloque de identidad");
  ok(
    "mi-cupo declara og:image absoluta (1200x630)",
    /<meta property="og:image" content="https:\/\/[^"]+\/og\.png"/.test(mi.text) &&
      /<meta property="og:image:width" content="1200"/.test(mi.text) &&
      /<meta property="og:image:height" content="630"/.test(mi.text),
    "faltan etiquetas og:image",
  );
  const ogRes = await fetch(`${BASE}/mi-cupo/${regId}/og.png`);
  const ogType = ogRes.headers.get("content-type") ?? "";
  const ogBytes = (await ogRes.arrayBuffer()).byteLength;
  ok(
    "GET /mi-cupo/:id/og.png -> 200 image/png",
    ogRes.status === 200 && ogType.startsWith("image/png") && ogBytes > 5000,
    `status ${ogRes.status} ${ogType} ${ogBytes}b`,
  );

  const ver = await html(`/verificar/${regId}`);
  ok("GET /verificar/:id -> 200", ver.status === 200 && ver.text.includes("Resultado"), `status ${ver.status}`);

  const verJson = await j(`/api/cupos/verify?q=${encodeURIComponent(regId)}`);
  ok("GET /api/cupos/verify -> encuentra el cupo", verJson.status === 200 && (verJson.body?.count ?? 0) >= 1, JSON.stringify(verJson.body ?? {}).slice(0, 180));

  if (emitted) {
    ok("cupo minted con assetId + owner", !!pub.body?.assetId && !!pub.body?.ownerAddress);
    ok("owner es direccion Solana plausible", /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pub.body?.ownerAddress ?? ""));
    const meta = await fetch(`${BASE}/api/cupos/meta/${regId}`);
    const metaBody: any = await meta.json().catch(() => null);
    ok("GET /api/cupos/meta/:id -> 200 metaplex", meta.status === 200 && !!metaBody?.name && !!metaBody?.rsanjur?.creado_por, `status ${meta.status}`);
    ok("metadata no transferible + credito rsanjur", metaBody?.properties?.non_transferable === true && metaBody?.rsanjur?.creado_por === "rsanjur.com");

    const byAsset = await j(`/api/cupos/verify?q=${encodeURIComponent(pub.body?.assetId ?? "x")}`);
    ok("verificador por assetId encuentra el cupo", (byAsset.body?.count ?? 0) >= 1);

    // Idempotencia: reintentar no duplica.
    const again = await j("/api/dev-cupo", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ registrationId: regId }) });
    const count = await j("/api/dev-query", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ sql: `SELECT count(*) AS n FROM cnft_tickets WHERE registration_id = '${regId}'` }),
    });
    ok("reintento idempotente (1 solo cupo)", Number(count.body?.results?.[0]?.n) === 1, JSON.stringify(again.body ?? {}).slice(0, 160));
  }

  // 4) El panel exige sesion de admin.
  const adminNoAuth = await j(`/api/admin/cupos?race=${race.id ?? "x"}`);
  ok("GET /api/admin/cupos sin sesion -> 401/403", adminNoAuth.status === 401 || adminNoAuth.status === 403, `status ${adminNoAuth.status}`);

  return finish();
}

function finish(): void {
  console.log(`\nResultado: ${pass} OK, ${fail} fallos`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
