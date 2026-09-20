"use client";

import CrudPage from "@/components/admin/CrudPage";
import { Badge } from "@/components/admin/ui";

export default function DestinosPage() {
  return (
    <CrudPage
      titulo="Destinos populares"
      descricao="Cards com foto da página inicial. O preço “a partir de” e o tempo vêm automaticamente das rotas cadastradas entre a origem e o destino."
      endpoint="/destinos"
      nomeItem="destino"
      fontes={{ cidades: { endpoint: "/cidades", valor: "id", rotulo: (c) => c.nome } }}
      inicial={{ titulo: "", descricao: "", etiqueta: "", imagem_url: "", origem_id: "", destino_id: "", ordem: "10", ativo: true }}
      campos={[
        { nome: "titulo", rotulo: "Título do card", tipo: "texto", dica: "Ex.: Aeroporto CDG ➔ Paris Centro" },
        { nome: "etiqueta", rotulo: "Etiqueta / região", tipo: "texto", nulo: true, dica: "Aparece sobre a foto e agrupa as regiões do rodapé." },
        { nome: "origem_id", rotulo: "Origem", tipo: "select", opcoesDe: "cidades", numerico: true },
        { nome: "destino_id", rotulo: "Destino", tipo: "select", opcoesDe: "cidades", numerico: true },
        { nome: "descricao", rotulo: "Descrição curta (até 300 caracteres)", tipo: "textarea", nulo: true },
        { nome: "imagem_url", rotulo: "Foto", tipo: "imagem", pasta: "destinos", nulo: true },
        { nome: "ordem", rotulo: "Ordem de exibição", tipo: "numero", passo: "1", dica: "Menor número aparece primeiro." },
        { nome: "ativo", rotulo: "Visível no site", tipo: "checkbox" },
      ]}
      colunas={[
        { titulo: "Foto", render: (l) => (l.imagem_url ? <img src={l.imagem_url} alt={l.titulo} className="w-16 h-11 object-cover rounded-md border border-slate-200" /> : <span className="text-xs text-slate-400">—</span>) },
        { titulo: "Destino", render: (l) => <div><div className="font-bold">{l.titulo}</div><div className="text-[11px] text-slate-500">{l.origem} → {l.destino}</div></div> },
        { titulo: "Etiqueta", render: (l) => l.etiqueta || "—" },
        { titulo: "Ordem", render: (l) => l.ordem },
        { titulo: "Site", render: (l, a) => <button type="button" onClick={a.alternarAtivo} title="Clique para alternar"><Badge cor={l.ativo ? "verde" : "cinza"}>{l.ativo ? "Visível" : "Oculto"}</Badge></button> },
      ]}
    />
  );
}
