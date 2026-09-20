"use client";

import CrudPage from "@/components/admin/CrudPage";
import { Alerta, Badge, eur } from "@/components/admin/ui";

export default function RotasPage() {
  return (
    <CrudPage
      titulo="Rotas e preços"
      descricao="Cada rota liga uma origem a um destino para um veículo. O preço pode ser FIXO (valor combinado da rota) ou CALCULADO: taxa fixa do veículo + km da rota × valor por km."
      endpoint="/rotas"
      nomeItem="rota"
      fontes={{
        cidades: { endpoint: "/cidades", valor: "id", rotulo: (c) => c.nome },
        veiculos: { endpoint: "/veiculos", valor: "id", rotulo: (v) => v.nome },
      }}
      busca={(l) => `${l.origem} ${l.destino} ${l.veiculo}`}
      inicial={{ origem_id: "", destino_id: "", veiculo_id: "", modo_preco: "fixo", preco_fixo: "0", distancia_km: "", tempo_estimado_minutos: "", ativo: true }}
      campos={[
        { nome: "origem_id", rotulo: "Origem", tipo: "select", opcoesDe: "cidades", numerico: true },
        { nome: "destino_id", rotulo: "Destino", tipo: "select", opcoesDe: "cidades", numerico: true },
        { nome: "veiculo_id", rotulo: "Veículo", tipo: "select", opcoesDe: "veiculos", numerico: true },
        { nome: "modo_preco", rotulo: "Como calcular o preço", tipo: "select", opcoes: [{ valor: "fixo", rotulo: "Preço fixo da rota" }, { valor: "km", rotulo: "Taxa fixa + valor por km" }] },
        { nome: "preco_fixo", rotulo: "Preço fixo (€)", tipo: "numero", mostrarSe: (f) => f.modo_preco === "fixo" },
        { nome: "distancia_km", rotulo: "Distância (km)", tipo: "numero", nulo: true, mostrarSe: (f) => f.modo_preco === "km", dica: "Obrigatória no modo por km." },
        { nome: "tempo_estimado_minutos", rotulo: "Tempo estimado (min)", tipo: "numero", passo: "1", nulo: true, dica: "Usado para calcular a disponibilidade do veículo." },
        { nome: "ativo", rotulo: "Rota ativa no site", tipo: "checkbox" },
      ]}
      rodapeForm={(f, fontes) => {
        if (f.modo_preco !== "km") return null;
        const v = (fontes.veiculos ?? []).find((x) => String(x.id) === String(f.veiculo_id));
        if (!v) return <Alerta tipo="aviso">Selecione o veículo para ver o preço calculado.</Alerta>;
        const km = Number(f.distancia_km || 0);
        const total = Number(v.preco_base) + km * Number(v.preco_por_km);
        return <Alerta tipo="sucesso">Preço calculado: {eur(v.preco_base)} + {km} km × {eur(v.preco_por_km)} = <strong>{eur(total)}</strong></Alerta>;
      }}
      colunas={[
        { titulo: "Trajeto", render: (l) => <span>{l.origem} → {l.destino}</span> },
        { titulo: "Veículo", render: (l) => l.veiculo },
        { titulo: "Preço", render: (l) => <div className="font-bold">{eur(l.preco_efetivo)}<div className="text-[11px] font-normal text-slate-500">{l.modo_preco === "km" ? `taxa + ${l.distancia_km} km` : "fixo"}</div></div> },
        { titulo: "Tempo", render: (l) => (l.tempo_estimado_minutos ? `${l.tempo_estimado_minutos} min` : "—") },
        { titulo: "Site", render: (l, a) => <button type="button" onClick={a.alternarAtivo} title="Clique para alternar"><Badge cor={l.ativo ? "verde" : "cinza"}>{l.ativo ? "Ativa" : "Inativa"}</Badge></button> },
      ]}
    />
  );
}
