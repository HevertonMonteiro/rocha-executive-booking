"use client";

import CrudPage from "@/components/admin/CrudPage";
import { Badge, eur } from "@/components/admin/ui";

const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function FrotaPage() {
  return (
    <CrudPage
      titulo="Frota"
      descricao="Veículos que aparecem no site (rodapé, escolha de veículo). A taxa fixa e o valor por km são usados nas rotas com preço calculado por quilômetro."
      endpoint="/veiculos"
      nomeItem="veículo"
      inicial={{ nome: "", slug: "", capacidade_passageiros: "4", capacidade_malas: "2", descricao: "", imagem_url: "", preco_base: "0", preco_por_km: "0", ativo: true }}
      campos={[
        { nome: "nome", rotulo: "Nome do veículo", tipo: "texto", aoMudar: (v, f, criando) => (criando ? { slug: slugify(v) } : {}) },
        { nome: "slug", rotulo: "Identificador (URL)", tipo: "texto", dica: "Só letras minúsculas, números e hífen." },
        { nome: "capacidade_passageiros", rotulo: "Máx. de passageiros", tipo: "numero", passo: "1" },
        { nome: "capacidade_malas", rotulo: "Máx. de malas", tipo: "numero", passo: "1" },
        { nome: "preco_base", rotulo: "Taxa fixa / bandeirada (€)", tipo: "numero", dica: "Valor fixo somado ao preço por km." },
        { nome: "preco_por_km", rotulo: "Valor por km (€)", tipo: "numero" },
        { nome: "descricao", rotulo: "Descrição", tipo: "textarea", nulo: true },
        { nome: "imagem_url", rotulo: "Foto do veículo", tipo: "imagem", pasta: "frota", nulo: true },
        { nome: "ativo", rotulo: "Disponível no site", tipo: "checkbox" },
      ]}
      colunas={[
        { titulo: "Foto", render: (l) => (l.imagem_url ? <img src={l.imagem_url} alt={l.nome} className="w-16 h-11 object-cover rounded-md border border-slate-200" /> : <span className="text-xs text-slate-400">—</span>) },
        { titulo: "Veículo", render: (l) => <div><div className="font-bold">{l.nome}</div><div className="text-[11px] text-slate-500">até {l.capacidade_passageiros} pax · {l.capacidade_malas} malas</div></div> },
        { titulo: "Taxa fixa", render: (l) => eur(l.preco_base) },
        { titulo: "Por km", render: (l) => eur(l.preco_por_km) },
        { titulo: "Site", render: (l, a) => <button type="button" onClick={a.alternarAtivo} title="Clique para alternar"><Badge cor={l.ativo ? "verde" : "cinza"}>{l.ativo ? "Ativo" : "Oculto"}</Badge></button> },
      ]}
    />
  );
}
