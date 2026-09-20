import { transacao } from "@/server/db/client";
import { comAdmin, idDe } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

// Desfaz um repasse lancado por engano: as corridas voltam a aparecer como "a pagar".
export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  return transacao(async (tx) => {
    exigir((await tx.query("select id from repasses where id = $1 for update", [id]))[0], "Repasse nao encontrado.");
    await tx.query("update reservas set repasse_id = null, updated_at = now() where repasse_id = $1", [id]);
    await tx.query("delete from repasses where id = $1", [id]);
    return { ok: true };
  });
});
