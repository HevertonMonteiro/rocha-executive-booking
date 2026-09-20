import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, lerConsulta } from "@/server/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const GET = comAdmin(async ({ req }) => {
  const { inicio, fim } = lerConsulta(req, schema);
  const p = [inicio ?? null, fim ?? null];
  const noPeriodo = (coluna: string) => `($1::date is null or ${coluna}::date >= $1::date) and ($2::date is null or ${coluna}::date <= $2::date)`;

  const [recebido] = await consulta(
    `select coalesce(sum(valor), 0) as total, count(*)::int as lancamentos from pagamentos where ${noPeriodo("pago_em")}`, p
  );
  const porMetodo = await consulta(
    `select metodo, coalesce(sum(valor), 0) as total from pagamentos where ${noPeriodo("pago_em")} group by metodo order by 2 desc`, p
  );
  const [repassado] = await consulta(
    `select coalesce(sum(valor_total), 0) as total from repasses where ${noPeriodo("pago_em")}`, p
  );
  // Viagens finalizadas no periodo: receita bruta x custo com parceiros = margem.
  const [margem] = await consulta(
    `select coalesce(sum(preco_total), 0) as receita, coalesce(sum(valor_parceiro), 0) as custo, count(*)::int as viagens
       from reservas where status = 'finalizado' and ${noPeriodo("data_ida")}`, p
  );
  // Saldos em aberto (independentes do periodo): a receber dos clientes e a pagar aos parceiros.
  const [aReceber] = await consulta(
    `select coalesce(sum(r.preco_total - coalesce((select sum(pg.valor) from pagamentos pg where pg.reserva_id = r.id), 0)), 0) as total
       from reservas r
      where r.status in ('confirmado', 'finalizado')
         or (r.status = 'pendente' and r.status_pagamento <> 'pendente')`
  );
  const porParceiro = await consulta(
    `select pa.id, pa.nome, pa.empresa,
            coalesce(sum(r.valor_parceiro) filter (where r.status = 'finalizado' and r.repasse_id is null), 0) as devido,
            coalesce(sum(r.valor_parceiro) filter (where r.status = 'confirmado'), 0) as previsto,
            count(*) filter (where r.status = 'finalizado' and r.repasse_id is null)::int as corridas_em_aberto
       from parceiros pa left join reservas r on r.parceiro_id = pa.id
      where pa.status in ('aprovado', 'inativo')
      group by pa.id order by devido desc, pa.nome`
  );
  const ultimosPagamentos = await consulta(
    `select pg.id, pg.valor, pg.metodo, pg.origem, pg.tipo, pg.pago_em::text as pago_em, r.codigo, r.passageiro_nome
       from pagamentos pg join reservas r on r.id = pg.reserva_id
      where ${noPeriodo("pg.pago_em")} order by pg.pago_em desc, pg.id desc limit 50`, p
  );
  return {
    recebido_no_periodo: recebido.total,
    lancamentos: recebido.lancamentos,
    por_metodo: porMetodo,
    repassado_no_periodo: repassado.total,
    margem_periodo: { receita: margem.receita, custo_parceiros: margem.custo, viagens: margem.viagens },
    a_receber: aReceber.total,
    a_pagar_total: porParceiro.reduce((t: number, l: any) => t + Math.round(Number(l.devido) * 100), 0) / 100,
    por_parceiro: porParceiro,
    ultimos_pagamentos: ultimosPagamentos,
  };
});
