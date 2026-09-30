-- Pedido de orcamento manual: o cliente digitou uma origem e/ou destino que nao
-- esta cadastrado nas rotas com preco fixo. Sem preco automatico, vira um pedido
-- que o gestor ve no painel e responde por fora (WhatsApp/telefone).
create table solicitacoes_orcamento (
  id                     integer generated always as identity primary key,
  -- Guarda o id quando bate com uma cidade cadastrada (podia ser so um lado
  -- desconhecido) e sempre o texto digitado, pra nunca perder o que o cliente pediu.
  origem_id              integer references cidades (id) on delete set null,
  origem_texto           text not null check (char_length(origem_texto) between 1 and 200),
  destino_id             integer references cidades (id) on delete set null,
  destino_texto          text not null check (char_length(destino_texto) between 1 and 200),
  tipo_trajeto           text not null default 'one_way' check (tipo_trajeto in ('one_way', 'return')),
  data_ida               timestamp not null,
  data_volta             timestamp,
  quantidade_passageiros integer not null default 1 check (quantidade_passageiros between 1 and 20),
  cliente_nome           text not null check (char_length(cliente_nome) between 2 and 100),
  cliente_telefone       text not null check (char_length(cliente_telefone) between 8 and 20),
  cliente_email          text check (cliente_email is null or char_length(cliente_email) <= 100),
  observacoes            text check (observacoes is null or char_length(observacoes) <= 2000),

  status                 text not null default 'pendente' check (status in ('pendente', 'respondido', 'descartado')),
  notas_internas         text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  check (data_volta is null or data_volta > data_ida),
  check (tipo_trajeto <> 'return' or data_volta is not null)
);
create index solicitacoes_orcamento_status_idx on solicitacoes_orcamento (status, created_at desc);

alter table public.solicitacoes_orcamento enable row level security;
alter table public.solicitacoes_orcamento force row level security;
create policy app_server_total on public.solicitacoes_orcamento for all to app_server using (true) with check (true);
grant select, insert, update, delete on public.solicitacoes_orcamento to app_server;
