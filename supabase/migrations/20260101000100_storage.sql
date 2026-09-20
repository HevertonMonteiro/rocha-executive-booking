-- Bucket publico (somente leitura) para fotos da frota e dos destinos.
-- Gravar/remover so e possivel pelo backend com a chave de servico; nao existe
-- politica de escrita para anon/authenticated.
-- Este arquivo so faz sentido no Supabase (schema `storage`); o desenvolvimento
-- local (PGlite) ignora a migracao quando o schema nao existe.
do $$
begin
  if exists (select from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update
      set public = true,
          file_size_limit = 5242880,
          allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

    if not exists (
      select from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'site_media_leitura_publica'
    ) then
      create policy site_media_leitura_publica on storage.objects
        for select to anon, authenticated using (bucket_id = 'site-media');
    end if;
  end if;
end
$$;
