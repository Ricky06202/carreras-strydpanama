// Normaliza cedulas de registrations/runners al formato canonico con guiones.
// Uso:  bun scripts/fix-cedulas.ts --dev | --remote
// Genera output/fix-cedulas.sql y lo aplica con wrangler d1 execute.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { formatCedula } from "../lib/cedula";

// modo remoto: wrangler CLI (necesita TTY -> correlo desde tu terminal)
function remoteQuery(sql: string): any[] {
  const out = execFileSync("bunx", ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["inherit", "pipe", "inherit"],
  });
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  return parsed[0]?.results ?? [];
}

function applyFile(file: string) {
  execFileSync("bunx", ["wrangler", "d1", "execute", DB, "--remote", "--file", file], { stdio: "inherit" });
}

const DEV = process.argv.includes("--dev");
const REMOTE = process.argv.includes("--remote");
const DB = "carreras-v2-db";
const DEV_URL = "http://localhost:5173/api/dev-query";

async function devQuery(sql: string): Promise<any[]> {
  const res = await fetch(DEV_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql }) });
  const j = (await res.json()) as { results?: any[] };
  if (!res.ok) throw new Error(`dev-query ${res.status}: ${JSON.stringify(j).slice(0, 160)}`);
  return j.results ?? [];
}



const stmts: string[] = [];
const skipped: string[] = [];

for (const table of ["registrations", "runners"]) {
  const sql = `SELECT id, cedula FROM ${table} WHERE cedula IS NOT NULL AND cedula != ''`;
  const rows: any[] = await (DEV ? (async () => devQuery(sql))() : (async () => remoteQuery(sql))());
  for (const r of rows as { id: string; cedula: string }[]) {
    const raw = String(r.cedula ?? "").trim();
    if (!raw) continue;
    const fixed = formatCedula(raw);
    if (!fixed) {
      skipped.push(`${table} ${r.id}: "${raw}" (no parece cedula, se deja igual)`);
      continue;
    }
    if (fixed === raw) continue;
    stmts.push(`UPDATE ${table} SET cedula = '${fixed.replace(/'/g, "")}' WHERE id = '${r.id.replace(/'/g, "")}';`);
  }
}

mkdirSync("scripts/migrate/output", { recursive: true });
writeFileSync("scripts/migrate/output/fix-cedulas.sql", stmts.join("\n") + "\n");
console.log(`${REMOTE ? "remote" : "local"}: ${stmts.length} cedulas a normalizar`);
for (const s of skipped) console.log("  !", s);

if (stmts.length === 0) process.exit(0);

const file = "scripts/migrate/output/fix-cedulas.sql";
if (DEV) {
  for (const st of stmts) await devQuery(st);
} else {
  applyFile(file);
}
console.log("aplicado ✔");
