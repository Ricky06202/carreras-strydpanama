import { requireAdminPage } from "@/lib/admin/page";
import { EquiposBoard } from "@/components/admin/EquiposBoard";

export const dynamic = "force-dynamic";

export default async function AdminEquiposPage() {
  await requireAdminPage();
  return <EquiposBoard />;
}
