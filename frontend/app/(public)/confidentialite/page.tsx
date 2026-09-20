import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et protection des données personnelles (RGPD) de Rocha Executive Transport.",
  alternates: { canonical: "/confidentialite" },
};

export default function Page() {
  return <LegalPage tipo="confidentialite" />;
}
