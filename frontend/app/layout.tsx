import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/lib/PreferencesContext";
import SiteChrome from "@/components/SiteChrome";
import { SiteConfigProvider } from "@/lib/SiteConfig";
import { carregarDadosPublicos } from "@/server/servicos/publico";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Fontes baixadas no build e servidas pelo proprio site (nada e carregado do Google).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

// O conteudo do site vem do banco (editado no painel): renderiza a cada requisicao.
export const dynamic = "force-dynamic";

const TITULO = "Transfert privé avec chauffeur en France | Rocha Executive Transport";
const DESCRICAO =
  "Transferts privés et executive en France : aéroports CDG et Orly, Paris, Disneyland, Marseille, Nice, Cannes. Prix fixe, chauffeurs professionnels, paiement sécurisé et assistance 24h/24.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITULO,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRICAO,
  keywords: [
    "transfert aéroport Paris",
    "chauffeur privé Paris",
    "transfert CDG Paris",
    "transfert Orly",
    "transfert Disneyland Paris",
    "transfert aéroport Nice",
    "transfert Cannes",
    "transfert Marseille",
    "taxi privé France",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: TITULO,
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
  robots: { index: true, follow: true },
};

const montarDadosEstruturados = (telefone: string) => ({
  "@context": "https://schema.org",
  "@type": "TaxiService",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRICAO,
  telephone: telefone,
  serviceType: "Transfert privé avec chauffeur",
  areaServed: [
    { "@type": "AdministrativeArea", name: "Île-de-France" },
    { "@type": "AdministrativeArea", name: "Bouches-du-Rhône" },
    { "@type": "AdministrativeArea", name: "Alpes-Maritimes" },
  ],
  availableLanguage: ["fr", "en", "pt", "es", "de", "it"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dados, veiculos, destinos } = await carregarDadosPublicos();
  const dadosEstruturados = montarDadosEstruturados(`+${dados.whatsapp_numero || "33783078111"}`);
  return (
    <html lang="fr" className={`scroll-smooth ${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }}
        />
        <PreferencesProvider>
          <SiteConfigProvider dados={dados} veiculos={veiculos} destinos={destinos}>
            <SiteChrome>{children}</SiteChrome>
          </SiteConfigProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
