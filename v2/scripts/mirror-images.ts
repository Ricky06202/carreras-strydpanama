#!/usr/bin/env bun
// Copia las imagenes legacy (bucket publico pub-*.r2.dev) al bucket R2 de v2.
// Uso:
//   bun scripts/mirror-images.ts --local   -> siembra el simulador dev via /api/dev-put-image
//   bun scripts/mirror-images.ts --remote  -> sube a carreras-v2-media real (wrangler r2 put --remote)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const R2_PUBLIC = "https://pub-ddaf4243012a44c5a61699bc0719121f.r2.dev";
const BUCKET = "carreras-v2-media";
const mode = process.argv[2] === "--remote" ? "remote" : "local";

const sql = await Bun.file(join(import.meta.dir, "migrate/output/migrated.sql")).text();
const keys = new Set<string>();
for (const m of sql.matchAll(/\/api\/images\/([A-Za-z0-9._-]+)/g)) keys.add(m[1]!);
console.log(`${keys.size} imagenes legacy detectadas (${mode})`);

const tmp = join(import.meta.dir, ".mirror-tmp");
mkdirSync(tmp, { recursive: true });

for (const key of keys) {
  const res = await fetch(`${R2_PUBLIC}/${key}`);
  if (!res.ok) {
    console.log(`  SALTO ${key} (HTTP ${res.status})`);
    continue;
  }
  const buf = await res.bytes();
  if (mode === "remote") {
    const f = join(tmp, key);
    writeFileSync(f, buf);
    const p = Bun.spawn(["bunx", "wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", f, "--remote", "--content-type", res.headers.get("content-type") ?? "image/jpeg"], { stdout: "pipe", stderr: "pipe" });
    await p.exited;
    console.log(`  REMOTO ${key} (${buf.length}b) ${p.exitCode === 0 ? "OK" : "FALLO"}`);
  } else {
    let s = "";
    for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.slice(i, i + 8192));
    const r = await fetch("http://localhost:5173/api/dev-put-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, base64: btoa(s) }),
    });
    console.log(`  LOCAL ${key}: ${r.status} ${buf.length}b`);
  }
}
console.log("listo");
