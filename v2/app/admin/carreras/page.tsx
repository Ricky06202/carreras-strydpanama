import { listRacesAdmin } from "@/lib/admin/races";
import { requireAdminPage } from "@/lib/admin/page";
import { CarrerasBoard } from "@/components/admin/CarrerasBoard";

export const dynamic = "force-dynamic";

export default async function AdminCarrerasPage() {
  await requireAdminPage();
  const races = await listRacesAdmin();
  return <CarrerasBoard races={races} />;
}
