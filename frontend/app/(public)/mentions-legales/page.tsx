import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site Rocha Executive Transport.",
  alternates: { canonical: "/mentions-legales" },
};

export default function Page() {
  return <LegalPage tipo="mentions" />;
}
