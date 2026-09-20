import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, lerConsulta } from "@/server/http";
import { Filtro, paginacao } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().default(25),
});

export const GET = comAdmin(async ({ req }) => {
  const q = lerConsulta(req, schema);
  const termo = q.q ? `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const f = new Filtro().adicionar((p) => `(c.nome ilike ${p} or c.email ilike ${p} or c.telefone ilike ${p})`, termo);
  const { limite, deslocamento } = paginacao(q.pagina, q.limite);
  const [{ total }] = await consulta<{ total: number }>(`select count(*)::int as total from clientes c ${f.where}`, f.params);
  const itens = await consulta(
    `select c.id, c.nome, c.email, c.telefone, c.idioma_preferido, c.created_at::text as created_at,
            (select count(*)::int from reservas r where r.cliente_id = c.id) as reservas,
            (select count(*)::int from reservas r where r.cliente_id = c.id and r.status <> 'cancelado') as reservas_ativas,
            coalesce((select sum(p.valor) from pagamentos p join reservas r on r.id = p.reserva_id where r.cliente_id = c.id), 0) as total_pago,
            (select max(r.data_ida)::text from reservas r where r.cliente_id = c.id) as ultima_viagem
       from clientes c ${f.where} order by c.created_at desc, c.id desc limit ${limite} offset ${deslocamento}`,
    f.params
  );
  return { itens, total, pagina: q.pagina, limite };
});
