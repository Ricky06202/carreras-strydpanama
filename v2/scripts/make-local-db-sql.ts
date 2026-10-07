// Genera lib/dev/local-db-sql.ts (ignorado: contiene PII del seed) a partir
// de las migraciones drizzle + scripts/migrate/output/migrated.sql.
// Uso: bun scripts/make-local-db-sql.ts  (requiere haber corrido bun scripts/migrate.ts)
import { join } from "node:path";

const root = import.meta.dirname;
const files = [
  "drizzle/0000_parched_magik.sql",
  "drizzle/0001_rainy_groot.sql",
  "drizzle/0002_cynical_madame_web.sql",
  "scripts/migrate/output/migrated.sql",
];

const chunks: string[] = [];
for (const f of files) {
  const sql = await Bun.file(join(root, "..", f)).text();
  const parts = f.startsWith("drizzle/")
    ? sql.split(/-->\s*statement-breakpoint/)
    : sql.split(/;\n/);
  chunks.push(...parts.map((s) => s.trim()).filter((s) => s && !s.startsWith("--")));
}

const out = `// ⚠️ GENERADO por scripts/make-local-db-sql.ts con DATOS PERSONALES REALES — NO COMMITEAR.\n// Regenerar tras cambiar el seed: bun scripts/migrate.ts && bun scripts/make-local-db-sql.ts\nexport const LOCAL_DB_STATEMENTS: string[] = [\n  ${chunks.map((s) => JSON.stringify(s)).join(",\n  ")},\n];\n`;
await Bun.write(join(root, "..", "lib", "dev", "local-db-sql.ts"), out);
console.log(`OK ${chunks.length} statements -> lib/dev/local-db-sql.ts (NO COMMITEAR este cambio)`);
