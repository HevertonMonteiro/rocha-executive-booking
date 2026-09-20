"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alerta, Botao, Campo, Card, Carregando, Kpi, METODOS, Tabela, Vazio, dataSistema, eur, inputCls, useCarregar } from "@/components/admin/ui";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function FinanceiroPage() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [fim, setFim] = useState("");
  const url = useMemo(() => `/financeiro?${new URLSearchParams({ ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) })}`, [inicio, fim]);
  const { dados: f, erro, carregando } = useCarregar<any>(url);

  const preset = (tipo: "mes" | "anterior" | "tudo") => {
    if (tipo === "mes") { setInicio(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1))); setFim(""); }
    if (tipo === "anterior") { setInicio(iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))); setFim(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0))); }
    if (tipo === "tudo") { setInicio(""); setFim(""); }
  };

  const margem = f ? Number(f.margem_periodo.receita) - Number(f.margem_periodo.custo_parceiros) : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-900 font-heading">Financeiro</h1>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="De"><input type="date" className={inputCls} value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
          <Campo rotulo="Até"><input type="date" className={inputCls} value={fim} onChange={(e) => setFim(e.target.value)} /></Campo>
          <Botao variante="secundario" tamanho="sm" onClick={() => preset("mes")}>Este mês</Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => preset("anterior")}>Mês anterior</Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => preset("tudo")}>Tudo</Botao>
        </div>
      </Card>

      {erro && <Alerta>{erro}</Alerta>}
      {carregando && !f ? <Carregando /> : f && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi rotulo="Recebido no período" valor={eur(f.recebido_no_periodo)} detalhe={`${f.lancamentos} lançamento(s)`} cor="text-green-700" />
            <Kpi rotulo="Repassado a parceiros" valor={eur(f.repassado_no_periodo)} detalhe="Pago no período" />
            <Kpi rotulo="A receber (clientes)" valor={eur(f.a_receber)} detalhe="Saldos em aberto hoje" cor="text-amber-700" />
            <Kpi rotulo="A pagar (parceiros)" valor={eur(f.a_pagar_total)} detalhe="Corridas finalizadas não repassadas" cor="text-red-700" />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card titulo="Resultado das viagens finalizadas no período">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Viagens</dt><dd className="font-bold">{f.margem_periodo.viagens}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Receita bruta</dt><dd className="font-bold">{eur(f.margem_periodo.receita)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Custo com parceiros</dt><dd className="font-bold">− {eur(f.margem_periodo.custo_parceiros)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2"><dt className="font-bold">Margem</dt><dd className={`font-black text-lg ${margem >= 0 ? "text-green-700" : "text-red-700"}`}>{eur(margem)}</dd></div>
              </dl>
            </Card>
            <Card titulo="Recebido por forma de pagamento">
              {f.por_metodo.length === 0 ? <Vazio>Nada recebido no período.</Vazio> : (
                <ul className="space-y-2 text-sm">
                  {f.por_metodo.map((m: any) => <li key={m.metodo} className="flex justify-between"><span>{METODOS[m.metodo] ?? m.metodo}</span><strong>{eur(m.total)}</strong></li>)}
                </ul>
              )}
            </Card>
          </div>

          <Card titulo="Quanto devo a cada parceiro">
            {f.por_parceiro.length === 0 ? <Vazio>Nenhum parceiro aprovado ainda.</Vazio> : (
              <Tabela colunas={["Parceiro", "Corridas em aberto", "Devo (finalizadas)", "Previsto (confirmadas)", ""]}>
                {f.por_parceiro.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4"><span className="font-bold">{p.nome}</span><div className="text-[11px] text-slate-500">{p.empresa}</div></td>
                    <td className="py-2.5 pr-4">{p.corridas_em_aberto}</td>
                    <td className="py-2.5 pr-4 font-bold">{Number(p.devido) > 0 ? <span className="text-red-700">{eur(p.devido)}</span> : eur(0)}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{eur(p.previsto)}</td>
                    <td className="py-2.5 text-right"><Link className="text-xs font-bold text-blue-700 hover:underline" href={`/admin/parceiros/${p.id}`}>Ver e dar baixa</Link></td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Card>

          <Card titulo="Últimos pagamentos recebidos">
            {f.ultimos_pagamentos.length === 0 ? <Vazio>Nenhum pagamento no período.</Vazio> : (
              <Tabela colunas={["Data", "Reserva", "Passageiro", "Forma", "Valor"]}>
                {f.ultimos_pagamentos.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4 whitespace-nowrap text-xs">{dataSistema(p.pago_em)}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{p.codigo}</td>
                    <td className="py-2 pr-4">{p.passageiro_nome}</td>
                    <td className="py-2 pr-4 text-xs">{METODOS[p.metodo] ?? p.metodo}{p.origem === "sumup" ? " (automático)" : ""}</td>
                    <td className="py-2 font-bold">{eur(p.valor)}</td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
