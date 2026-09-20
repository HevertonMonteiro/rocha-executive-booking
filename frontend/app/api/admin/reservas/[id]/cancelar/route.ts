import { transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  return transacao(async (tx) => {
    const [r] = await tx.query<{ status: string; repasse_id: number | null }>(
      "select status, repasse_id from reservas where id = $1 for update",
      [id]
    );
    exigir(r, "Reserva nao encontrada.");
    if (r.status === "cancelado") throw new ErroHttp(409, "Esta reserva ja esta cancelada.");
    if (r.status === "finalizado" || r.repasse_id) throw new ErroHttp(409, "Nao e possivel cancelar uma viagem finalizada ou ja repassada.");
    await tx.query("update reservas set status = 'cancelado', updated_at = now() where id = $1", [id]);
    const [{ recebido }] = await tx.query<{ recebido: string }>(
      "select coalesce(sum(valor), 0) as recebido from pagamentos where reserva_id = $1",
      [id]
    );
    // O estorno ao cliente e feito manualmente na SumUp; o sistema apenas avisa.
    return { ok: true, valor_a_estornar: Number(recebido).toFixed(2) };
  });
});
