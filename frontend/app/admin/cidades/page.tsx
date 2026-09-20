"use client";

import CrudPage from "@/components/admin/CrudPage";

const TIPOS = [
  { valor: "aeroporto", rotulo: "Aeroporto" },
  { valor: "cidade", rotulo: "Cidade" },
  { valor: "parque", rotulo: "Parque" },
  { valor: "estacao", rotulo: "Estação" },
];

const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CidadesPage() {
  return (
    <div className="space-y-10">
      <CrudPage
        titulo="Cidades e locais"
        descricao="Pontos de partida e destino que o cliente encontra na busca (aeroportos, cidades, parques e estações)."
        endpoint="/cidades"
        nomeItem="local"
        fontes={{ regioes: { endpoint: "/regioes", valor: "id", rotulo: (r) => r.nome } }}
        busca={(l) => `${l.nome} ${l.regiao} ${l.codigo_iata ?? ""}`}
        inicial={{ regiao_id: "", nome: "", tipo: "cidade", codigo_iata: "" }}
        campos={[
          { nome: "nome", rotulo: "Nome", tipo: "texto" },
          { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS },
          { nome: "regiao_id", rotulo: "Região", tipo: "select", opcoesDe: "regioes", numerico: true },
          { nome: "codigo_iata", rotulo: "Código IATA", tipo: "texto", nulo: true, dica: "Só para aeroportos (ex.: CDG)." },
        ]}
        colunas={[
          { titulo: "Local", render: (l) => <span className="font-bold">{l.nome}</span> },
          { titulo: "Tipo", render: (l) => TIPOS.find((t) => t.valor === l.tipo)?.rotulo ?? l.tipo },
          { titulo: "Região", render: (l) => l.regiao },
          { titulo: "IATA", render: (l) => l.codigo_iata || "—" },
        ]}
      />
      <CrudPage
        secundario
        titulo="Regiões"
        descricao="Agrupam as cidades. Só é possível excluir uma região sem cidades."
        endpoint="/regioes"
        nomeItem="região"
        inicial={{ nome: "", slug: "" }}
        campos={[
          { nome: "nome", rotulo: "Nome", tipo: "texto", aoMudar: (v, f, criando) => (criando ? { slug: slugify(v) } : {}) },
          { nome: "slug", rotulo: "Identificador (URL)", tipo: "texto" },
        ]}
        colunas={[
          { titulo: "Região", render: (l) => <span className="font-bold">{l.nome}</span> },
          { titulo: "Identificador", render: (l) => <span className="font-mono text-xs">{l.slug}</span> },
        ]}
      />
    </div>
  );
}
