import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { obterBanco } from "./client";

/**
 * Aplica supabase/migrations/*.sql em ordem (usado no desenvolvimento local e
 * nos testes). Em producao, as migracoes sao aplicadas com o Supabase CLI
 * (`supabase db push`), usando os mesmos arquivos.
 */
export async function migrar(): Promise<string[]> {
  const banco = await obterBanco();
  await banco.query(
    "create table if not exists _migracoes (arquivo text primary key, aplicada_em timestamptz not null default now())"
  );
  const pasta = path.resolve(process.cwd(), "..", "supabase", "migrations");
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith(".sql")).sort();
  const aplicadas: string[] = [];
  for (const arquivo of arquivos) {
    const ja = await banco.query("select 1 from _migracoes where arquivo = $1", [arquivo]);
    if (ja.length) continue;
    const sql = await readFile(path.join(pasta, arquivo), "utf-8");
    await banco.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into _migracoes (arquivo) values ($1)", [arquivo]);
    });
    aplicadas.push(arquivo);
  }
  return aplicadas;
}
