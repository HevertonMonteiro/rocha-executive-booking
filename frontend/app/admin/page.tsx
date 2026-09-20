"use client";

import Link from "next/link";
import { Card, Carregando, Alerta, Kpi, StatusBadge, STATUS_PAGAMENTO, STATUS_RESERVA, Tabela, Vazio, dataViagem, eur, useCarregar } from "@/components/admin/ui";

interface Painel {
  reservas: Record<string, number>;
  parceiros: { solicitacoes: number; ativos: number };
  financeiro: { recebido_mes: string; recebido_total: string; a_receber: string; a_pagar_parceiros: string };
  proximas_viagens: any[];
}

export default function PainelPage() {
  const { dados, erro, carregando } = useCarregar<Painel>("/dashboard");
  if (carregando) return <Carregando />;
  if (erro || !dados) return <Alerta>{erro}</Alerta>;
  const { reservas: r, parceiros: p, financeiro: f } = dados;

  const atalhos = [
    { rotulo: "Novas (com pagamento)", valor: r.novas_pagas, href: "/admin/reservas?status=pendente&status_pagamento=parcial", cor: "text-blue-700", dica: "Entraram e já pagaram — destine um parceiro" },
    { rotulo: "Aguardando pagamento", valor: r.aguardando_pagamento, href: "/admin/reservas?status=pendente&status_pagamento=pendente", cor: "text-amber-700", dica: "Reserva criada, cliente ainda não pagou" },
    { rotulo: "Sem parceiro", valor: r.sem_parceiro, href: "/admin/reservas?sem_parceiro=1", cor: "text-red-700", dica: "Precisam de motorista destinado" },
    { rotulo: "Confirmadas", valor: r.confirmadas, href: "/admin/reservas?status=confirmado", cor: "text-slate-900", dica: "Viagens agendadas" },
    { rotulo: "Solicitações de parceiros", valor: p.solicitacoes, href: "/admin/parceiros?status=pendente", cor: "text-purple-700", dica: "Aguardando sua análise" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 font-heading">Painel</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {atalhos.map((a) => (
          <Link key={a.rotulo} href={a.href} className="block hover:-translate-y-0.5 transition">
            <Kpi rotulo={a.rotulo} valor={a.valor} detalhe={a.dica} cor={a.cor} />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi rotulo="Recebido no mês" valor={eur(f.recebido_mes)} cor="text-green-700" />
        <Kpi rotulo="Recebido (total)" valor={eur(f.recebido_total)} />
        <Kpi rotulo="A receber dos clientes" valor={eur(f.a_receber)} detalhe="Saldos de viagens confirmadas/finalizadas" cor="text-amber-700" />
        <Link href="/admin/financeiro" className="block">
          <Kpi rotulo="A pagar aos parceiros" valor={eur(f.a_pagar_parceiros)} detalhe="Corridas finalizadas ainda não repassadas" cor="text-red-700" />
        </Link>
      </div>

      <Card titulo="Próximas viagens" acoes={<Link href="/admin/reservas" className="text-xs font-bold text-blue-700 hover:underline">Ver todas</Link>}>
        {dados.proximas_viagens.length === 0 ? (
          <Vazio>Nenhuma viagem futura.</Vazio>
        ) : (
          <Tabela colunas={["Data", "Trajeto", "Passageiro", "Parceiro", "Status", "Pagamento"]}>
            {dados.proximas_viagens.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="py-2.5 pr-4 whitespace-nowrap font-medium"><Link href={`/admin/reservas/${v.id}`} className="text-blue-700 hover:underline">{dataViagem(v.data_ida)}</Link></td>
                <td className="py-2.5 pr-4">{v.origem} → {v.destino}<div className="text-[11px] text-slate-500">{v.veiculo}</div></td>
                <td className="py-2.5 pr-4">{v.passageiro_nome}</td>
                <td className="py-2.5 pr-4">{v.parceiro_nome ?? <span className="text-red-600 text-xs font-bold">Sem parceiro</span>}</td>
                <td className="py-2.5 pr-4"><StatusBadge mapa={STATUS_RESERVA} valor={v.status} /></td>
                <td className="py-2.5"><StatusBadge mapa={STATUS_PAGAMENTO} valor={v.status_pagamento} /></td>
              </tr>
            ))}
          </Tabela>
        )}
      </Card>
    </div>
  );
}
