import { transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe } from "@/server/http";
import { exigir } from "@/server/servicos/admin";
import { recalcularStatusPagamento } from "@/server/servicos/pagamentos";

export const dynamic = "force-dynamic";

// Remove um lancamento MANUAL feito por engano. Pagamentos da SumUp nao podem ser apagados.
export const DELETE = comAdmin(async (ctx) => {
  const reservaId = idDe(ctx);
  const pid = idDe(ctx, "pid");
  return transacao(async (tx) => {
    const [p] = await tx.query<{ origem: string }>("select origem from pagamentos where id = $1 and reserva_id = $2 for update", [pid, reservaId]);
    exigir(p, "Pagamento nao encontrado.");
    if (p.origem !== "manual") throw new ErroHttp(409, "Pagamentos da SumUp nao podem ser removidos.");
    await tx.query("delete from pagamentos where id = $1", [pid]);
    return { ok: true, status_pagamento: await recalcularStatusPagamento(tx, reservaId) };
  });
});
