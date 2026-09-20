"use client";

import { createContext, useContext, useMemo } from "react";

export interface DadosSite {
  empresa_nome: string;
  whatsapp_numero: string;
  whatsapp_exibicao: string;
  email_contato: string;
  endereco: string;
  siret: string;
  instagram_url: string;
  facebook_url: string;
  sinal_percentual: string;
  forme_juridique: string;
  capital_social: string;
  tva_intracom: string;
  directeur_publication: string;
  mediateur_consommation: string;
}

export interface VeiculoPublico {
  id: number;
  nome: string;
  slug: string;
  capacidade_passageiros: number;
  capacidade_malas: number;
  descricao: string | null;
  imagem_url: string | null;
}

export interface DestinoPopular {
  id: number;
  titulo: string;
  descricao: string | null;
  etiqueta: string | null;
  imagem_url: string | null;
  origem_id: number;
  destino_id: number;
  preco_a_partir: string | null;
  tempo_minutos: number | null;
}

// Valores usados se o banco estiver indisponivel: o site nunca fica sem contato.
export const PADRAO_SITE: DadosSite = {
  empresa_nome: "Rocha Executive Transport",
  whatsapp_numero: "33783078111",
  whatsapp_exibicao: "+33 7 83 07 81 11",
  email_contato: "",
  endereco: "",
  siret: "",
  instagram_url: "",
  facebook_url: "",
  sinal_percentual: "20",
  forme_juridique: "",
  capital_social: "",
  tva_intracom: "",
  directeur_publication: "",
  mediateur_consommation: "",
};

interface SiteConfigCtx extends DadosSite {
  whatsappLink: string;
  sinalPct: number;
  veiculos: VeiculoPublico[];
  destinos: DestinoPopular[];
}

const Ctx = createContext<SiteConfigCtx>({
  ...PADRAO_SITE,
  whatsappLink: "#",
  sinalPct: 20,
  veiculos: [],
  destinos: [],
});

export function SiteConfigProvider({
  dados,
  veiculos,
  destinos,
  children,
}: {
  dados: Partial<DadosSite>;
  veiculos: VeiculoPublico[];
  destinos: DestinoPopular[];
  children: React.ReactNode;
}) {
  const valor = useMemo<SiteConfigCtx>(() => {
    // Campos vazios no banco caem no padrao (ex.: numero do WhatsApp).
    const d = { ...PADRAO_SITE };
    for (const k of Object.keys(d) as (keyof DadosSite)[]) if (dados[k]) d[k] = dados[k] as string;
    const sinal = Number(d.sinal_percentual);
    return {
      ...d,
      whatsappLink: `https://wa.me/${d.whatsapp_numero}?text=${encodeURIComponent(
        `Olá, gostaria de informações sobre transfer executivo com a ${d.empresa_nome}.`
      )}`,
      sinalPct: Number.isFinite(sinal) && sinal >= 20 && sinal <= 99 ? sinal : 20,
      veiculos,
      destinos,
    };
  }, [dados, veiculos, destinos]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSiteConfig = () => useContext(Ctx);
