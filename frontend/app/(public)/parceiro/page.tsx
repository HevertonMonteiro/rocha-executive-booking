import type { Metadata } from "next";
import ParceiroConteudo from "./ParceiroConteudo";

export const metadata: Metadata = {
  title: "Devenir partenaire chauffeur",
  description:
    "Chauffeurs et sociétés de transport : devenez partenaire Rocha Executive Transport et recevez des courses de clients internationaux en France.",
  alternates: { canonical: "/parceiro" },
};

export default function ParceiroPage() {
  return <ParceiroConteudo />;
}
