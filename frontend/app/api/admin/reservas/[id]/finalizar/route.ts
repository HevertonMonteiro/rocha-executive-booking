import { transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  return transacao(async (tx) => {
    const [r] = await tx.query<{ status: string }>("select status from reservas where id = $1 for update", [id]);
    exigir(r, "Reserva nao encontrada.");
    if (r.status !== "confirmado") throw new ErroHttp(409, "Somente viagens confirmadas podem ser finalizadas.");
    await tx.query("update reservas set status = 'finalizado', finalizado_em = now(), updated_at = now() where id = $1", [id]);
    return { ok: true };
  });
});
