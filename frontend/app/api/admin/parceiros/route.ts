import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, lerConsulta, lerCorpo } from "@/server/http";
import { Filtro } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["pendente", "aprovado", "recusado", "inativo"]).optional(),
  q: z.string().trim().max(100).optional(),
});

export const GET = comAdmin(async ({ req }) => {
  const q = lerConsulta(req, schema);
  const termo = q.q ? `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const f = new Filtro()
    .adicionar((p) => `p.status = ${p}`, q.status)
    .adicionar((p) => `(p.nome ilike ${p} or p.empresa ilike ${p} or p.email ilike ${p} or p.cidade ilike ${p})`, termo);
  return consulta(
    `select p.id, p.nome, p.email, p.telefone, p.empresa, p.cidade, p.endereco, p.site, p.status,
            p.observacoes_internas, p.created_at::text as created_at, p.aprovado_em::text as aprovado_em,
            (select count(*)::int from reservas r where r.parceiro_id = p.id and r.status = 'finalizado') as viagens_finalizadas,
            coalesce((select sum(r.valor_parceiro) from reservas r where r.parceiro_id = p.id and r.status = 'finalizado' and r.repasse_id is null), 0) as a_pagar,
            coalesce((select sum(r.valor_parceiro) from reservas r where r.parceiro_id = p.id and r.status = 'confirmado'), 0) as previsto
       from parceiros p ${f.where}
      order by case p.status when 'pendente' then 0 when 'aprovado' then 1 else 2 end, p.created_at desc`,
    f.params
  );
});

const schemaNovo = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(100),
  telefone: z.string().trim().min(8).max(20),
  empresa: z.string().trim().min(2).max(150),
  cidade: z.string().trim().min(2).max(100),
  endereco: z.string().trim().min(3).max(200),
  site: z.string().trim().max(200).nullable().optional(),
  dados_pagamento: z.string().trim().max(500).nullable().optional(),
});

// Parceiro cadastrado diretamente pelo admin ja nasce aprovado.
export const POST = comAdmin(async ({ req }) => {
  const d = await lerCorpo(req, schemaNovo);
  const [p] = await consulta<{ id: number }>(
    `insert into parceiros (nome, email, telefone, empresa, cidade, endereco, site, dados_pagamento, status, aprovado_em)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'aprovado', now()) returning id`,
    [d.nome, d.email, d.telefone, d.empresa, d.cidade, d.endereco, d.site || null, d.dados_pagamento || null]
  );
  return { id: p.id };
});
