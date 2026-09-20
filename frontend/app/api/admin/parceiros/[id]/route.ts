import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

export const GET = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const [p] = await consulta(
    `select id, nome, email, telefone, empresa, cidade, endereco, site, status, dados_pagamento, observacoes_internas,
            created_at::text as created_at, aprovado_em::text as aprovado_em
       from parceiros where id = $1`,
    [id]
  );
  return exigir(p, "Parceiro nao encontrado.");
});

const schema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(100).optional(),
  telefone: z.string().trim().min(8).max(20).optional(),
  empresa: z.string().trim().min(2).max(150).optional(),
  cidade: z.string().trim().min(2).max(100).optional(),
  endereco: z.string().trim().min(3).max(200).optional(),
  site: z.string().trim().max(200).nullable().optional(),
  dados_pagamento: z.string().trim().max(500).nullable().optional(),
  observacoes_internas: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["pendente", "aprovado", "recusado", "inativo"]).optional(),
});

export const PATCH = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schema);
  const campos = d as Record<string, unknown>;
  const colunas = Object.keys(campos).filter((c) => campos[c] !== undefined);
  if (!colunas.length) return { ok: true };

  const sets = colunas.map((c, i) => `${c} = $${i + 2}`);
  if (d.status === "aprovado") sets.push("aprovado_em = coalesce(aprovado_em, now())");
  const r = await consulta(`update parceiros set ${sets.join(", ")} where id = $1 returning id`, [id, ...colunas.map((c) => campos[c])]);
  exigir(r[0], "Parceiro nao encontrado.");
  return { ok: true };
});

export const DELETE = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const [{ n }] = await consulta<{ n: number }>(
    "select (select count(*) from reservas where parceiro_id = $1)::int + (select count(*) from repasses where parceiro_id = $1)::int as n",
    [id]
  );
  if (n > 0) throw new ErroHttp(409, "Este parceiro tem historico de viagens/repasses. Marque como inativo em vez de excluir.");
  await consulta("delete from parceiros where id = $1", [id]);
  return { ok: true };
});
