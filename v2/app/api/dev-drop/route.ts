import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "solo dev" }, { status: 403 });
  }
  const drop = ["registrations","payments","results","raffle_winners","timing_events","teams","registration_codes","runners","participant_types","race_categories","race_distances","races","settings","sponsors","__new_registrations","__new_teams","__new_races","__drizzle_temp"];
  const errs: string[] = [];
  for (const t of drop) {
    try {
      await env.DB.prepare(`DROP TABLE IF EXISTS \`${t}\``).run();
    } catch (e) {
      errs.push(`${t}: ${String((e as Error).message).slice(0, 60)}`);
    }
  }
  const left = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  return NextResponse.json({ ok: errs.length === 0, errs, remaining: left.results });
}
