import { join } from "node:path";

const dir = join(import.meta.dirname, "migrate", "export");

type Row = Record<string, unknown>;
async function load(name: string): Promise<Row[]> {
  return JSON.parse(await Bun.file(join(dir, `v1_${name}.json`)).text());
}

function iso(unixSec: unknown): string {
  if (unixSec == null) return `'${new Date().toISOString().slice(0, 19).replace("T", " ")}'`;
  return `'${new Date(Number(unixSec) * 1000).toISOString().slice(0, 19).replace("T", " ")}'`;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function q(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insert(table: string, cols: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const values = rows.map((r) => `  (${r.map((c) => (typeof c === "string" && c === "RAW:null" ? "NULL" : c)).join(", ")})`);
  return `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES\n${values.join(",\n")};\n`;
}

const payStatus: Record<string, [string, string]> = {
  pending: ["preinscrito", "pendiente"],
  paid: ["inscrito", "pagado"],
  refunded: ["anulado", "reembolsado"],
};
const txStatus: Record<string, string> = {
  pending: "pending",
  completed: "approved",
  failed: "declined",
  refunded: "refunded",
};

const [races, categories, distances, participants, transactions, runningTeams] = await Promise.all([
  load("races"),
  load("categories"),
  load("distances"),
  load("participants"),
  load("transactions"),
  load("running_teams"),
]);

const teamIds = new Set(runningTeams.map((t) => t.id));
const raceIds = new Set(races.map((r) => r.id));
const catIds = new Set(categories.map((c) => c.id));
const distIds = new Set(distances.map((d) => d.id));
const participantIds = new Set(participants.map((p) => p.id));

function orphans(name: string, total: number, kept: number) {
  if (kept < total) console.log(`  huérfanos descartados en ${name}: ${total - kept}`);
}

const catsOk = categories.filter((c) => raceIds.has(String(c.race_id)));
orphans("race_categories", categories.length, catsOk.length);
const distOk = distances.filter((d) => raceIds.has(String(d.race_id)));
orphans("race_distances", distances.length, distOk.length);
const regsOk = participants.filter(
  (p) =>
    raceIds.has(String(p.race_id)) &&
    (!p.category_id || catIds.has(String(p.category_id))) &&
    (!p.distance_id || distIds.has(String(p.distance_id))) &&
    (!p.team_id || teamIds.has(String(p.team_id))),
);
orphans("registrations", participants.length, regsOk.length);
const regIds = new Set(regsOk.map((p) => p.id));
const payOk = transactions.filter((t) => regIds.has(String(t.participant_id)));
orphans("payments", transactions.length, payOk.length);
const usedSlugs = new Map<string, number>();

const raceRows = races.map((r) => {
  let slug = slugify(String(r.name));
  const n = usedSlugs.get(slug) ?? 0;
  usedSlugs.set(slug, n + 1);
  if (n > 0) slug = `${slug}-${n + 1}`;
  return [
    q(r.id), q(slug), q(r.name), q(r.description), q(r.date), q(r.start_time ?? null),
    q(r.location), q(r.image_url), q(r.route_gpx_url), q(r.technical_info),
    q(r.terms_and_conditions), q(Number(r.price ?? 0)), "0", "NULL", "NULL",
    r.max_participants == null ? "NULL" : q(Number(r.max_participants)),
    q(r.status === "open" ? "accepting" : r.status ?? "upcoming"),
    r.show_timer == null ? "1" : q(r.show_timer ? true : false),
    "NULL",
    r.show_shirt_size == null ? "1" : q(r.show_shirt_size ? true : false),
    r.timer_start == null ? "NULL" : q(Number(r.timer_start) * 1000),
    r.timer_stop == null ? "NULL" : q(Number(r.timer_stop) * 1000),
    "NULL", "NULL", "0", "0", "NULL", iso(r.created_at), iso(r.updated_at),
  ];
});

const categoryRows = catsOk.map((c) => [
  q(c.id), q(c.race_id), q(c.name), q(c.description), "0", "99", "'ambos'",
]);

const distanceRows = distOk.map((d) => [
  q(d.id), q(d.race_id), q(d.name), "0", "NULL", "NULL", "0",
]);

const regRows = regsOk.map((p) => {
  const [status, payment] = payStatus[String(p.payment_status ?? "pending")] ?? payStatus.pending!;
  const teamId = p.team_id && teamIds.has(String(p.team_id)) ? q(p.team_id) : "RAW:null";
  const teamName = p.team_name ?? p.team ?? null;
  return [
    q(p.id), q(p.race_id), "RAW:null",
    q(`SP-${String(p.id).slice(0, 8).toUpperCase()}`),
    q(`${p.first_name} ${p.last_name}`), q(p.first_name), q(p.last_name), q(p.email),
    q(p.phone), q(p.cedula), q(p.birth_date), q(p.gender), q(p.country ?? "Panamá"),
    p.category_id ? q(p.category_id) : "RAW:null",
    p.distance_id ? q(p.distance_id) : "RAW:null",
    "RAW:null", teamId,
    q(teamName), "RAW:null", q(p.size), q(status), q(payment), "0",
    "RAW:null",
    p.finish_time == null ? "RAW:null" : q(Number(p.finish_time)),
    "RAW:null", "RAW:null", "RAW:null", "0", "0",
    "RAW:null", "RAW:null", "RAW:null", "RAW:null",
    iso(p.registered_at), iso(p.registered_at),
  ];
});

const paymentCols = ["id", "registration_id", "amount", "currency", "status", "provider", "order_id", "receipt_url", "payload", "created_at", "updated_at"];
const paymentRows = payOk.map((t) => [
  q(t.id), q(t.participant_id), q(Number(t.amount ?? 0)), "'USD'",
  q(txStatus[String(t.status)] ?? "pending"), "'yappy'",
  q(t.yappy_order_id ?? `legacy-${String(t.id).slice(0, 8)}`),
  "RAW:null", "RAW:null", iso(t.created_at), iso(t.updated_at),
]);

const teamRows = runningTeams.map((t) => [
  q(t.id), q(t.name), q(t.is_approved ? true : false), iso(null), iso(null),
]);

const sql = [
  "PRAGMA foreign_keys = OFF;",
  insert("races", ["id","slug","title","description","date","start_time","location","image_url","route_gpx_url","technical_info","terms_and_conditions","price","platform_fee","legacy_price","legacy_cutoff","max_participants","status","show_timer","starting_bib","show_shirt_size","timer_start_ms","timer_stop_ms","timer2_start_ms","timer2_stop_ms","team_enabled","padrino_enabled","certificate_logo_url","created_at","updated_at"], raceRows),
  insert("race_categories", ["id","race_id","title","description","min_age","max_age","gender"], categoryRows),
  insert("race_distances", ["id","race_id","title","kilometers","price","description","sort_order"], distanceRows),
  insert("teams", ["id","name","is_approved","created_at","updated_at"], teamRows),
  insert("registrations", ["id","race_id","runner_id","confirmation_code","title","first_name","last_name","email","phone","cedula","birth_date","gender","country","category_id","distance_id","participant_type_id","team_id","team_name","bib_number","shirt_size","status","payment_status","amount_paid","discount_code","finish_time_sec","checkpoint_time_sec","timing_source","timing_confidence","is_padrino","donated_tickets","shipping_address","student_id_url","matricula_url","photo_url","created_at","updated_at"], regRows),
  insert("payments", paymentCols, paymentRows),
  "PRAGMA foreign_keys = ON;",
].join("\n");

const out = join(import.meta.dirname, "migrate", "output", "migrated.sql");
await Bun.write(out, sql);
console.log(`OK: ${races.length} races, ${catsOk.length} cats, ${distOk.length} dist, ${regsOk.length} regs, ${payOk.length} payments, ${runningTeams.length} teams`);
console.log(`-> ${out}`);
