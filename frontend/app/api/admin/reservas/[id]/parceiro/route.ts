import { z } from "zod";
import { transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir } from "@/server/servicos/admin";
import { conflitosDoParceiro } from "@/server/servicos/disponibilidade";

export const dynamic = "force-dynamic";

const schema = z.object({
  parceiro_id: z.number().int().positive().nullable(),
  valor_parceiro: z.number().min(0).max(100000).nullable().optional(),
});

// Destina (ou remove) o parceiro que fara a viagem e define quanto ele recebe.
export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schema);
  return transacao(async (tx) => {
    const [r] = await tx.query<{ status: string; repasse_id: number | null }>(
      "select status, repasse_id from reservas where id = $1 for update",
      [id]
    );
    exigir(r, "Reserva nao encontrada.");
    if (!["pendente", "confirmado"].includes(r.status))
      throw new ErroHttp(409, "So e possivel destinar parceiro em reservas pendentes ou confirmadas.");
    if (r.repasse_id) throw new ErroHttp(409, "Esta corrida ja foi paga ao parceiro.");

    if (d.parceiro_id === null) {
      await tx.query("update reservas set parceiro_id = null, valor_parceiro = null, updated_at = now() where id = $1", [id]);
      return { ok: true, conflitos: [] as string[] };
    }
    const [p] = await tx.query<{ status: string }>("select status from parceiros where id = $1", [d.parceiro_id]);
    exigir(p, "Parceiro nao encontrado.");
    if (p.status !== "aprovado") throw new ErroHttp(422, "Somente parceiros aprovados podem receber viagens.");

    await tx.query(
      "update reservas set parceiro_id = $2, valor_parceiro = coalesce($3::numeric, valor_parceiro), updated_at = now() where id = $1",
      [id, d.parceiro_id, d.valor_parceiro ?? null]
    );
    return { ok: true, conflitos: await conflitosDoParceiro(tx, d.parceiro_id, id) };
  });
});
