import { z } from "zod";
import { consulta } from "@/server/db/client";
import { comAdmin, lerConsulta, lerCorpo } from "@/server/http";
import { schemaNovaReserva } from "@/server/schemas";
import { criarReserva } from "@/server/servicos/reservas";
import { deCentavos } from "@/server/dinheiro";
import { Filtro, paginacao, SQL_RESERVA_RESUMO } from "@/server/servicos/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["pendente", "confirmado", "finalizado", "cancelado"]).optional(),
  status_pagamento: z.enum(["pendente", "parcial", "pago"]).optional(),
  parceiro_id: z.coerce.number().int().positive().optional(),
  sem_parceiro: z.enum(["1"]).optional(),
  q: z.string().trim().max(100).optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().default(25),
});

export const GET = comAdmin(async ({ req }) => {
  const q = lerConsulta(req, schema);
  const termo = q.q ? `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const f = new Filtro()
    .adicionar((p) => `r.status = ${p}`, q.status)
    .adicionar((p) => `r.status_pagamento = ${p}`, q.status_pagamento)
    .adicionar((p) => `r.parceiro_id = ${p}`, q.parceiro_id)
    .adicionar((p) => `r.data_ida::date >= ${p}::date`, q.de)
    .adicionar((p) => `r.data_ida::date <= ${p}::date`, q.ate)
    .adicionar(
      (p) => `(r.codigo ilike ${p} or r.passageiro_nome ilike ${p} or c.email ilike ${p} or r.passageiro_telefone ilike ${p})`,
      termo
    );
  const where = q.sem_parceiro ? (f.where ? `${f.where} and r.parceiro_id is null` : "where r.parceiro_id is null") : f.where;
  const { limite, deslocamento } = paginacao(q.pagina, q.limite);

  const [{ total }] = await consulta<{ total: number }>(
    `select count(*)::int as total from reservas r join clientes c on c.id = r.cliente_id ${where}`,
    f.params
  );
  const itens = await consulta(
    `${SQL_RESERVA_RESUMO} ${where} order by r.created_at desc, r.id desc limit ${limite} offset ${deslocamento}`,
    f.params
  );
  return { itens, total, pagina: q.pagina, limite };
});

// Reserva criada pelo proprio admin (pedido por telefone/WhatsApp).
export const POST = comAdmin(async ({ req }) => {
  const dados = await lerCorpo(req, schemaNovaReserva);
  const r = await criarReserva(dados);
  return { id: r.id, codigo: r.codigo, preco_total: deCentavos(r.precoTotalCentavos) };
});
