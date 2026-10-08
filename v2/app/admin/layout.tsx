import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/AdminBar";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Panel administrativo",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-void min-h-dvh">
      <AdminBar />
      <div className="pt-20">{children}</div>
      <Toaster />
    </div>
  );
}
