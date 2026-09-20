import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions générales de vente des transferts privés avec chauffeur Rocha Executive Transport : réservation, prix, paiement, annulation.",
  alternates: { canonical: "/conditions-generales" },
};

export default function Page() {
  return <LegalPage tipo="cgv" />;
}
