import "server-only";
import type { ZodObject, ZodRawShape } from "zod";
import { consulta } from "./db/client";
import { NextResponse } from "next/server";
import { comAdmin, idDe, lerCorpo } from "./http";
import { exigir } from "./servicos/admin";

interface ConfigCrud {
  tabela: string;
  schema: ZodObject<ZodRawShape>;
  /** SELECT completo da listagem (com ORDER BY). */
  listar: string;
  /** SELECT de um item (deve terminar com "where <alias>.id = $1"). */
  buscar: string;
}

/**
 * CRUD generico para o conteudo do site gerenciado pelo painel. As colunas vem
 * SEMPRE das chaves do schema (lista fixa no codigo) e os valores sao
 * parametrizados: nao existe SQL montado com texto do usuario.
 */
export function crud(cfg: ConfigCrud) {
  const colunasValidas = Object.keys(cfg.schema.shape);
  const parcial = cfg.schema.partial();

  const colecao = {
    GET: comAdmin(() => consulta(cfg.listar)),
    POST: comAdmin(async ({ req }) => {
      const d = (await lerCorpo(req, cfg.schema)) as Record<string, unknown>;
      const colunas = colunasValidas.filter((c) => d[c] !== undefined);
      const [novo] = await consulta<{ id: number }>(
        `insert into ${cfg.tabela} (${colunas.join(", ")}) values (${colunas.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
        colunas.map((c) => d[c])
      );
      const [linha] = await consulta(cfg.buscar, [novo.id]);
      return NextResponse.json(linha, { status: 201, headers: { "Cache-Control": "no-store" } });
    }),
  };

  const item = {
    GET: comAdmin(async (ctx) => exigir((await consulta(cfg.buscar, [idDe(ctx)]))[0], "Registro nao encontrado.")),
    PATCH: comAdmin(async (ctx) => {
      const id = idDe(ctx);
      const d = (await lerCorpo(ctx.req, parcial)) as Record<string, unknown>;
      const colunas = colunasValidas.filter((c) => d[c] !== undefined);
      if (colunas.length) {
        const r = await consulta(
          `update ${cfg.tabela} set ${colunas.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1 returning id`,
          [id, ...colunas.map((c) => d[c])]
        );
        exigir(r[0], "Registro nao encontrado.");
      }
      return (await consulta(cfg.buscar, [id]))[0];
    }),
    DELETE: comAdmin(async (ctx) => {
      const r = await consulta(`delete from ${cfg.tabela} where id = $1 returning id`, [idDe(ctx)]);
      exigir(r[0], "Registro nao encontrado.");
      return { ok: true };
    }),
  };

  return { colecao, item };
}
