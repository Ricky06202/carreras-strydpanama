// Sincroniza los datos maestros de las carreras desde la CMS viva de v1 (SonicJS)
// hacia el D1 de v2. El export del migrate quedo obsoleto (el cliente renombro
// carreras, cambio fechas y subio posters nuevos despues del dump).
//
// Uso:
//   bun scripts/sync-races.ts --dev          (aplica al D1/bucket del dev server)
//   bun scripts/sync-races.ts                (solo genera SQL + posters en output/)
//
// El remoto se aplica desde tu terminal con los comandos que imprime al final.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "https://api.carreras.strydpanama.com";
const DEV_URL = "http://localhost:5173";
const OUT = join(import.meta.dirname, "migrate", "output");

// v1 (vivo) -> v2 (nuestro id heredado del export viejo)
const ID_MAP: Record<string, string> = {
  "f0c9d33d-47b0-4d87-8dc6-9a2d7b3134f5": "4ff4e1dc-a8ef-4ac4-a624-86fd24e2efda", // UTP 2026
  "6d494596-07e0-4108-af73-8fdb57cca548": "40d0b199-c427-4f2d-a5bb-3462084919f0", // Camara Junior David
};

const SLUGS: Record<string, string> = {
  "4ff4e1dc-a8ef-4ac4-a624-86fd24e2efda": "5k-utp-chiriqui-2026",
  "40d0b199-c427-4f2d-a5bb-3462084919f0": "5k-carrera-por-el-futuro-david",
};

function oauthToken(): string {
  const toml = readFileSync(join(homedir(), ".config/.wrangler/config/default.toml"), "utf8");
  const m = toml.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("no oauth_token en config de wrangler");
  return m[1];
}

const q = (v: unknown): string =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

async function devQuery(sql: string) {
  const res = await fetch(`${DEV_URL}/api/dev-query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) throw new Error(`dev-query ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

async function devPutImage(key: string, data: ArrayBuffer) {
  const res = await fetch(`${DEV_URL}/api/dev-put-image?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body: data,
  });
  if (!res.ok) throw new Error(`dev-put-image ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

const racesRes = await fetch(`${API}/api/collections/races/content`, {
  headers: { authorization: `Bearer ${oauthToken()}` },
});
if (!racesRes.ok) throw new Error(`v1 API ${racesRes.status}`);
const { data: liveRaces } = (await racesRes.json()) as { data: { id: string; data: Record<string, unknown> }[] };

mkdirSync(join(OUT, "posters"), { recursive: true });
const stmts: string[] = [];
const posters: { key: string; file: string }[] = [];

for (const lr of liveRaces) {
  const v2id = ID_MAP[lr.id];
  if (!v2id) {
    console.log(`? carrera viva sin mapeo: ${lr.id} ${JSON.stringify(lr.data.title)}`);
    continue;
  }
  const d = lr.data;
  const imgRaw = String(d.imageUrl ?? "");
  const imgKey = imgRaw ? imgRaw.split("/").pop()! : null;

  if (imgKey) {
    const imgRes = await fetch(imgRaw.startsWith("http") ? imgRaw : `${API}${imgRaw}`);
    if (!imgRes.ok) throw new Error(`fallo descargando poster ${imgKey}: ${imgRes.status}`);
    const buf = await imgRes.arrayBuffer();
    const file = join(OUT, "posters", imgKey);
    writeFileSync(file, Buffer.from(buf));
    posters.push({ key: imgKey, file });
    console.log(`poster: ${imgKey} (${(buf.byteLength / 1024) | 0}kb)`);
  }

  const sets = [
    `title = ${q(String(d.title ?? "").trim())}`,
    `slug = ${q(SLUGS[v2id])}`,
    `description = ${q(d.description)}`,
    `date = ${q(d.date)}`,
    `start_time = ${q(d.startTime ?? d.start_time)}`,
    `location = ${q(d.location)}`,
    `price = ${q(d.price ?? 0)}`,
    `max_participants = ${q(d.maxParticipants ?? d.max_participants)}`,
    `image_url = ${q(imgKey ? `/api/images/${imgKey}` : null)}`,
    `certificate_logo_url = ${q(d.certificateLogoUrl ? String(d.certificateLogoUrl).split("/").pop() : null)}`,
    `technical_info = ${q(d.technicalInfo ?? d.technical_info)}`,
    `terms_and_conditions = ${q(d.termsAndConditions ?? d.terms_and_conditions)}`,
    `team_enabled = ${d.teamEnabled ?? d.team_enabled ? 1 : 0}`,
    `padrino_enabled = ${d.padrinoEnabled ?? d.padrino_enabled ? 1 : 0}`,
  ].join(", ");
  stmts.push(`UPDATE races SET ${sets} WHERE id = '${v2id}';`);
}

writeFileSync(join(OUT, "sync-races.sql"), stmts.join("\n") + "\n");
console.log(`SQL generado: ${stmts.length} carreras -> scripts/migrate/output/sync-races.sql`);

if (process.argv.includes("--dev")) {
  for (const st of stmts) await devQuery(st);
  for (const p of posters) await devPutImage(p.key, readFileSync(p.file) as unknown as ArrayBuffer);
  console.log("aplicado al DEV (D1 + bucket local) ✔");
}

console.log(`
— Para aplicar en REMOTO (tu terminal):
  cd ~/Dev/carreras-strydpanama/v2
  bunx wrangler d1 execute carreras-v2-db --remote --file scripts/migrate/output/sync-races.sql
${posters.map((p) => `  bunx wrangler r2 object put carreras-v2-media/${p.key} --file scripts/migrate/output/posters/${p.key} --remote`).join("\n")}
`);
