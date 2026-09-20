import { z } from "zod";
import { consulta } from "@/server/db/client";
import { deCentavos, paraCentavos } from "@/server/dinheiro";
import { comAdmin, idDe, lerConsulta } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** "Quanto devo a este parceiro no periodo": corridas finalizadas e ainda nao repassadas. */
export const GET = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const { inicio, fim } = lerConsulta(ctx.req, schema);
  const [parceiro] = await consulta("select id, nome, empresa, dados_pagamento from parceiros where id = $1", [id]);
  exigir(parceiro, "Parceiro nao encontrado.");

  const colunas = `r.id, r.codigo, r.data_ida::text as data_ida, r.valor_parceiro, r.preco_total, r.passageiro_nome,
                   o.nome as origem, d.nome as destino`;
  const juncoes = "from reservas r join rotas ro on ro.id = r.rota_id join cidades o on o.id = ro.origem_id join cidades d on d.id = ro.destino_id";
  const periodo = "and ($2::date is null or r.data_ida::date >= $2::date) and ($3::date is null or r.data_ida::date <= $3::date)";

  const devidas = await consulta(
    `select ${colunas} ${juncoes}
      where r.parceiro_id = $1 and r.status = 'finalizado' and r.repasse_id is null ${periodo}
      order by r.data_ida`,
    [id, inicio ?? null, fim ?? null]
  );
  const previstas = await consulta(
    `select ${colunas} ${juncoes}
      where r.parceiro_id = $1 and r.status = 'confirmado' ${periodo} order by r.data_ida`,
    [id, inicio ?? null, fim ?? null]
  );
  const soma = (linhas: { valor_parceiro: string | null }[]) => linhas.reduce((t, l) => t + paraCentavos(l.valor_parceiro), 0);
  return {
    parceiro,
    devidas,
    previstas,
    total_devido: deCentavos(soma(devidas as any)),
    total_previsto: deCentavos(soma(previstas as any)),
  };
});
