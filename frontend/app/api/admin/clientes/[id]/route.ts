import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir, SQL_RESERVA_RESUMO } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const GET = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const [cliente] = await consulta(
    "select id, nome, email, telefone, idioma_preferido, created_at::text as created_at from clientes where id = $1",
    [id]
  );
  exigir(cliente, "Cliente nao encontrado.");
  const reservas = await consulta(`${SQL_RESERVA_RESUMO} where r.cliente_id = $1 order by r.data_ida desc`, [id]);
  return { ...cliente, reservas };
});

const schema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(100).optional(),
  telefone: z.string().trim().min(8).max(20).optional(),
  idioma_preferido: z.enum(["pt", "en", "fr", "es", "de", "it"]).optional(),
});

export const PATCH = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schema);
  const colunas = Object.keys(d).filter((c) => (d as Record<string, unknown>)[c] !== undefined);
  if (!colunas.length) return { ok: true };
  const r = await consulta(
    `update clientes set ${colunas.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1 returning id`,
    [id, ...colunas.map((c) => (d as Record<string, unknown>)[c])]
  );
  exigir(r[0], "Cliente nao encontrado.");
  return { ok: true };
});

// Exclusao (direito ao apagamento - RGPD) so e possivel sem reservas associadas.
export const DELETE = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const [{ n }] = await consulta<{ n: number }>("select count(*)::int as n from reservas where cliente_id = $1", [id]);
  if (n > 0) throw new ErroHttp(409, "Este cliente possui reservas e nao pode ser excluido.");
  await consulta("delete from clientes where id = $1", [id]);
  return { ok: true };
});
