import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin/page";
import { TomboleBoard, type TomboleRaceOption } from "@/components/admin/TomboleBoard";

export const dynamic = "force-dynamic";

export default async function AdminTombolePage() {
  await requireAdminPage();
  const db = getDb();
  const races = (await db
    .select({ id: schema.races.id, title: schema.races.title, date: schema.races.date })
    .from(schema.races)
    .orderBy(desc(schema.races.date))
    .limit(80)
    .all()) as TomboleRaceOption[];
  return <TomboleBoard races={races} />;
}
