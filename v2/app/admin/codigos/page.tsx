import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin/page";
import { CodigosBoard, type RaceOption } from "@/components/admin/CodigosBoard";

export const dynamic = "force-dynamic";

export default async function AdminCodigosPage() {
  await requireAdminPage();
  const db = getDb();
  const races = (await db
    .select({ id: schema.races.id, title: schema.races.title, date: schema.races.date, status: schema.races.status })
    .from(schema.races)
    .orderBy(desc(schema.races.date))
    .limit(80)
    .all()) as RaceOption[];

  return <CodigosBoard races={races} />;
}
