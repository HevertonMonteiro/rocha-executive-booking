-- A Supabase concede automaticamente acesso total a `anon` e `authenticated` em
-- toda tabela nova criada pelo papel `postgres` (default privileges). A migracao
-- base so revogou o que ja existia, entao `solicitacoes_orcamento` nasceu aberta
-- para a API publica (o RLS bloqueava as linhas, mas nao bloqueia TRUNCATE).
-- Aqui revogamos de novo e cortamos a concessao automatica para tabelas futuras.
do $$
declare
  papel text;
begin
  foreach papel in array array['anon', 'authenticated'] loop
    if exists (select from pg_roles where rolname = papel) then
      execute format('revoke all on all tables in schema public from %I', papel);
      execute format('revoke all on all sequences in schema public from %I', papel);
      execute format('revoke all on all functions in schema public from %I', papel);
      if exists (select from pg_roles where rolname = 'postgres') then
        execute format('alter default privileges for role postgres in schema public revoke all on tables from %I', papel);
        execute format('alter default privileges for role postgres in schema public revoke all on sequences from %I', papel);
        execute format('alter default privileges for role postgres in schema public revoke all on functions from %I', papel);
      end if;
    end if;
  end loop;
end
$$;
