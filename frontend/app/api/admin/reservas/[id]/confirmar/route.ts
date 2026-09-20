import { z } from "zod";
import { transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir } from "@/server/servicos/admin";
import { pagamentoMinimoAtingido } from "@/server/servicos/pagamentos";
import { deCentavos } from "@/server/dinheiro";

export const dynamic = "force-dynamic";

export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const { permitir_sem_pagamento } = await lerCorpo(ctx.req, z.object({ permitir_sem_pagamento: z.boolean().optional() }));
  return transacao(async (tx) => {
    const [r] = await tx.query<{ status: string; parceiro_id: number | null; valor_parceiro: string | null }>(
      "select status, parceiro_id, valor_parceiro from reservas where id = $1 for update",
      [id]
    );
    exigir(r, "Reserva nao encontrada.");
    if (r.status !== "pendente") throw new ErroHttp(409, "Somente reservas pendentes podem ser confirmadas.");
    if (!r.parceiro_id) throw new ErroHttp(422, "Destine um parceiro antes de confirmar a viagem.");
    if (r.valor_parceiro === null) throw new ErroHttp(422, "Informe quanto sera pago ao parceiro por esta corrida.");
    // O cliente so conclui a reserva pagando o sinal minimo (20%+) ou o total.
    const pg = await pagamentoMinimoAtingido(tx, id);
    if (!pg.atingido && !permitir_sem_pagamento)
      throw new ErroHttp(409, `O pagamento minimo (${deCentavos(pg.minimoCentavos)} EUR) ainda nao foi recebido. Confirmar mesmo assim?`, "SEM_PAGAMENTO");
    await tx.query("update reservas set status = 'confirmado', confirmado_em = now(), updated_at = now() where id = $1", [id]);
    return { ok: true };
  });
});
