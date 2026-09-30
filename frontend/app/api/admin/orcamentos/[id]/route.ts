import { consulta } from "@/server/db/client";
import { comAdmin, idDe, lerCorpo } from "@/server/http";
import { schemaAtualizarOrcamento } from "@/server/schemas";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const PATCH = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schemaAtualizarOrcamento);
  const campos: Record<string, unknown> = { status: d.status, notas_internas: d.notas_internas };
  const colunas = Object.keys(campos).filter((c) => campos[c] !== undefined);
  if (!colunas.length) return { ok: true };
  const [linha] = await consulta<{ id: number }>(
    `update solicitacoes_orcamento set ${colunas.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now()
     where id = $1 returning id`,
    [id, ...colunas.map((c) => campos[c])]
  );
  exigir(linha, "Solicitacao nao encontrada.");
  return { ok: true };
});
