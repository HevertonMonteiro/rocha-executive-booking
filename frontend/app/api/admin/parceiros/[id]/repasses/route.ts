import { z } from "zod";
import { consulta, transacao } from "@/server/db/client";
import { deCentavos, paraCentavos } from "@/server/dinheiro";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const GET = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  return consulta(
    `select rp.id, rp.periodo_inicio::text as periodo_inicio, rp.periodo_fim::text as periodo_fim, rp.valor_total, rp.metodo,
            rp.observacao, rp.pago_em::text as pago_em, (select count(*)::int from reservas r where r.repasse_id = rp.id) as corridas
       from repasses rp where rp.parceiro_id = $1 order by rp.pago_em desc, rp.id desc`,
    [id]
  );
});

const schema = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reserva_ids: z.array(z.number().int().positive()).max(500).optional(),
  metodo: z.enum(["transferencia", "dinheiro", "outro"]).default("transferencia"),
  observacao: z.string().trim().max(500).nullable().optional(),
});

/**
 * Da baixa nas corridas ja pagas ao parceiro: cria o repasse e marca cada corrida
 * como paga, zerando o que se devia. Tudo em uma transacao (ou baixa tudo, ou nada).
 */
export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schema);
  return transacao(async (tx) => {
    exigir((await tx.query("select id from parceiros where id = $1 for update", [id]))[0], "Parceiro nao encontrado.");

    const elegiveis = await tx.query<{ id: number; valor_parceiro: string | null }>(
      `select r.id, r.valor_parceiro from reservas r
        where r.parceiro_id = $1 and r.status = 'finalizado' and r.repasse_id is null and r.valor_parceiro is not null
          and ($2::date is null or r.data_ida::date >= $2::date)
          and ($3::date is null or r.data_ida::date <= $3::date)
          and ($4::int[] is null or r.id = any($4::int[]))
        order by r.data_ida for update of r`,
      [id, d.inicio ?? null, d.fim ?? null, d.reserva_ids ?? null]
    );
    if (d.reserva_ids && elegiveis.length !== new Set(d.reserva_ids).size)
      throw new ErroHttp(422, "Alguma corrida selecionada nao esta finalizada ou ja foi paga.");
    if (!elegiveis.length) throw new ErroHttp(422, "Nao ha corridas finalizadas em aberto para este parceiro no periodo.");

    const total = elegiveis.reduce((t, r) => t + paraCentavos(r.valor_parceiro), 0);
    const [repasse] = await tx.query<{ id: number }>(
      `insert into repasses (parceiro_id, periodo_inicio, periodo_fim, valor_total, metodo, observacao, criado_por_id)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [id, d.inicio ?? null, d.fim ?? null, deCentavos(total), d.metodo, d.observacao ?? null, ctx.admin.id]
    );
    await tx.query("update reservas set repasse_id = $1, updated_at = now() where id = any($2::int[])", [
      repasse.id,
      elegiveis.map((r) => r.id),
    ]);
    return { ok: true, repasse_id: repasse.id, corridas: elegiveis.length, valor_total: deCentavos(total) };
  });
});
