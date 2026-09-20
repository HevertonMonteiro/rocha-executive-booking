import { consulta } from "@/server/db/client";
import { comAdmin } from "@/server/http";
import { SQL_RESERVA_RESUMO } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const GET = comAdmin(async () => {
  const [contagens] = await consulta(
    `select
       count(*) filter (where status = 'pendente' and status_pagamento <> 'pendente')::int as novas_pagas,
       count(*) filter (where status = 'pendente' and status_pagamento = 'pendente')::int as aguardando_pagamento,
       count(*) filter (where status in ('pendente', 'confirmado') and parceiro_id is null)::int as sem_parceiro,
       count(*) filter (where status = 'confirmado')::int as confirmadas,
       count(*) filter (where status = 'finalizado')::int as finalizadas,
       count(*) filter (where status = 'cancelado')::int as canceladas
     from reservas`
  );
  const [parceiros] = await consulta("select count(*) filter (where status = 'pendente')::int as solicitacoes, count(*) filter (where status = 'aprovado')::int as ativos from parceiros");
  const [fin] = await consulta(
    `select
       coalesce((select sum(valor) from pagamentos where date_trunc('month', pago_em) = date_trunc('month', now())), 0) as recebido_mes,
       coalesce((select sum(valor) from pagamentos), 0) as recebido_total,
       coalesce((select sum(r.preco_total - coalesce((select sum(pg.valor) from pagamentos pg where pg.reserva_id = r.id), 0))
                   from reservas r where r.status in ('confirmado', 'finalizado') or (r.status = 'pendente' and r.status_pagamento <> 'pendente')), 0) as a_receber,
       coalesce((select sum(valor_parceiro) from reservas where status = 'finalizado' and repasse_id is null and parceiro_id is not null), 0) as a_pagar_parceiros`
  );
  const proximas = await consulta(
    `${SQL_RESERVA_RESUMO} where r.status in ('pendente', 'confirmado') and r.data_ida >= (now() at time zone 'Europe/Paris') - interval '2 hours'
      order by r.data_ida limit 8`
  );
  return { reservas: contagens, parceiros, financeiro: fin, proximas_viagens: proximas };
});
