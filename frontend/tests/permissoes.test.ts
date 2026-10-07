import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { obterBanco } from "@/server/db/client";
import { prepararBanco } from "./ajuda";

type Banco = Awaited<ReturnType<typeof obterBanco>>;
let banco: Banco;

const privilegios = async (papel: string) =>
  banco.query<{ tabela: string; privilegio: string }>(
    `select table_name as tabela, privilege_type as privilegio from information_schema.role_table_grants
      where table_schema = 'public' and grantee = $1`,
    [papel]
  );

beforeAll(async () => {
  await prepararBanco();
  banco = await obterBanco();
  // Reproduz a Supabase: papeis da API publica que ganham acesso automatico a toda tabela nova.
  await banco.exec(`
    do $$ begin
      if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $$;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
  `);
  const sql = await readFile(path.resolve(process.cwd(), "..", "supabase", "migrations", "20260101000300_permissoes.sql"), "utf-8");
  await banco.exec(sql);
});

describe("API publica da Supabase (anon/authenticated) sem acesso ao banco", () => {
  it("nenhuma tabela existente fica acessivel", async () => {
    expect(await privilegios("anon")).toEqual([]);
    expect(await privilegios("authenticated")).toEqual([]);
  });

  it("tabelas criadas em migracoes futuras tambem nascem fechadas", async () => {
    await banco.exec("create table tabela_futura (id integer primary key)");
    expect(await privilegios("anon")).toEqual([]);
    expect(await privilegios("authenticated")).toEqual([]);
    await banco.exec("drop table tabela_futura");
  });
});
