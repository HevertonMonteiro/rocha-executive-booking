import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

// Area restrita: fora dos buscadores e sem indexacao.
export const metadata: Metadata = {
  title: { absolute: "Painel administrativo" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
