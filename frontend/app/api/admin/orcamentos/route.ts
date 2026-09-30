import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, lerConsulta } from "@/server/http";
import { Filtro, paginacao } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["pendente", "respondido", "descartado"]).optional(),
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().default(25),
});

const SQL_RESUMO = `
  select o.id, o.origem_id, o.origem_texto, o.destino_id, o.destino_texto, o.tipo_trajeto,
         o.data_ida::text as data_ida, o.data_volta::text as data_volta, o.quantidade_passageiros,
         o.cliente_nome, o.cliente_telefone, o.cliente_email, o.observacoes,
         o.status, o.notas_internas, o.created_at::text as created_at,
         oc.nome as origem_cadastrada, dc.nome as destino_cadastrado
    from solicitacoes_orcamento o
    left join cidades oc on oc.id = o.origem_id
    left join cidades dc on dc.id = o.destino_id`;

export const GET = comAdmin(async ({ req }) => {
  const q = lerConsulta(req, schema);
  const termo = q.q ? `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const f = new Filtro()
    .adicionar((p) => `o.status = ${p}`, q.status)
    .adicionar(
      (p) => `(o.cliente_nome ilike ${p} or o.cliente_telefone ilike ${p} or o.origem_texto ilike ${p} or o.destino_texto ilike ${p})`,
      termo
    );
  const { limite, deslocamento } = paginacao(q.pagina, q.limite);

  const [{ total }] = await consulta<{ total: number }>(`select count(*)::int as total from solicitacoes_orcamento o ${f.where}`, f.params);
  const itens = await consulta(`${SQL_RESUMO} ${f.where} order by o.created_at desc, o.id desc limit ${limite} offset ${deslocamento}`, f.params);
  return { itens, total, pagina: q.pagina, limite };
});
