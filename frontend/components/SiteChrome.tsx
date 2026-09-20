"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Footer from "@/components/Footer";

// O painel admin tem layout proprio: nao mostra cabecalho, rodape nem WhatsApp do site.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <FloatingWhatsApp />
      <Footer />
    </>
  );
}
