import { z } from "zod";
import { consulta } from "@/server/db/client";
import { lerConsulta, publica } from "@/server/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  regiao: z.string().trim().max(100).optional(),
});

export const GET = publica(async ({ req }) => {
  const { q, regiao } = lerConsulta(req, schema);
  const termo = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const linhas = await consulta(
    `select c.id, c.nome, c.tipo, c.codigo_iata, c.regiao_id, g.slug as regiao
       from cidades c join regioes g on g.id = c.regiao_id
      where ($1::text is null or g.slug = $1)
        and ($2::text is null or c.nome ilike $2 or c.codigo_iata ilike $2)
      order by c.nome limit 20`,
    [regiao ?? null, termo]
  );
  return linhas;
});
