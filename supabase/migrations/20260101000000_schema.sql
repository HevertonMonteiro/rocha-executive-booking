-- =============================================================================
-- Rocha Executive Transport — esquema do banco (PostgreSQL / Supabase)
--
-- Seguranca:
--  * RLS habilitado em TODAS as tabelas, sem nenhuma politica para anon /
--    authenticated: a API publica do Supabase (PostgREST) nao le nem grava nada.
--  * Somente o papel `app_server` (usado pelo backend no Netlify, via conexao
--    direta) tem acesso. Ele NAO e superusuario e nao pode alterar o esquema.
--  * Valores monetarios em numeric(10,2); datas de viagem em timestamp SEM fuso
--    (horario local da Franca no ponto de embarque).
-- =============================================================================

-- Papel da aplicacao (sem login). O login e a senha sao definidos manualmente
-- depois, fora do repositorio (ver docs/DEPLOY.md).
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_server') then
    create role app_server nologin;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Conteudo do site
-- ---------------------------------------------------------------------------
create table regioes (
  id    integer generated always as identity primary key,
  nome  text not null check (char_length(nome) between 1 and 100),
  slug  text not null unique check (slug ~ '^[a-z0-9-]+$')
);

create table cidades (
  id          integer generated always as identity primary key,
  regiao_id   integer not null references regioes (id) on delete restrict,
  nome        text not null check (char_length(nome) between 1 and 100),
  tipo        text not null default 'cidade' check (tipo in ('aeroporto', 'cidade', 'parque', 'estacao')),
  codigo_iata text check (codigo_iata is null or char_length(codigo_iata) <= 10)
);
create index cidades_regiao_idx on cidades (regiao_id);

create table veiculos (
  id                     integer generated always as identity primary key,
  nome                   text not null check (char_length(nome) between 1 and 60),
  slug                   text not null unique check (slug ~ '^[a-z0-9-]+$'),
  capacidade_passageiros integer not null check (capacidade_passageiros > 0),
  capacidade_malas       integer not null check (capacidade_malas >= 0),
  descricao              text,
  imagem_url             text,
  -- Rotas em modo 'km': preco = preco_base + distancia_km * preco_por_km
  preco_base             numeric(10, 2) not null default 0 check (preco_base >= 0),
  preco_por_km           numeric(10, 2) not null default 0 check (preco_por_km >= 0),
  ativo                  boolean not null default true
);

create table rotas (
  id                     integer generated always as identity primary key,
  origem_id              integer not null references cidades (id) on delete restrict,
  destino_id             integer not null references cidades (id) on delete restrict,
  veiculo_id             integer not null references veiculos (id) on delete restrict,
  preco_fixo             numeric(10, 2) not null default 0 check (preco_fixo >= 0),
  tempo_estimado_minutos integer check (tempo_estimado_minutos is null or tempo_estimado_minutos > 0),
  distancia_km           numeric(8, 2) check (distancia_km is null or distancia_km >= 0),
  modo_preco             text not null default 'fixo' check (modo_preco in ('fixo', 'km')),
  ativo                  boolean not null default true,
  unique (origem_id, destino_id, veiculo_id),
  check (origem_id <> destino_id),
  check (modo_preco <> 'km' or distancia_km is not null)
);
create index rotas_busca_idx on rotas (origem_id, destino_id) where ativo;

create table destinos_populares (
  id         integer generated always as identity primary key,
  titulo     text not null check (char_length(titulo) between 1 and 150),
  descricao  text check (descricao is null or char_length(descricao) <= 300),
  etiqueta   text check (etiqueta is null or char_length(etiqueta) <= 60),
  imagem_url text,
  origem_id  integer not null references cidades (id) on delete restrict,
  destino_id integer not null references cidades (id) on delete restrict,
  ordem      integer not null default 0,
  ativo      boolean not null default true
);

-- Dados da empresa e parametros (whatsapp, e-mail, endereco, sinal_percentual...)
create table configuracoes (
  chave text primary key check (char_length(chave) <= 80),
  valor text not null default ''
);

-- ---------------------------------------------------------------------------
-- Administracao
-- ---------------------------------------------------------------------------
create table admins (
  id         integer generated always as identity primary key,
  email      text not null check (email = lower(email)),
  nome       text not null default 'Administrador',
  senha_hash text not null,
  ativo      boolean not null default true,
  mfa_secret text,                        -- cifrado (AES-256-GCM) pela aplicacao
  mfa_ativo  boolean not null default false,
  mfa_ultimo_passo bigint,                -- impede reutilizar o mesmo codigo TOTP
  sessao_versao integer not null default 0, -- incrementa para invalidar todas as sessoes abertas
  created_at timestamptz not null default now()
);
create unique index admins_email_uq on admins (email);

-- Trilha de auditoria: quem fez o que e quando (sem corpo das requisicoes)
create table auditoria_admin (
  id          bigint generated always as identity primary key,
  admin_id    integer,
  acao        text not null,
  status_http integer,
  ip          text,
  criado_em   timestamptz not null default now()
);
create index auditoria_admin_data_idx on auditoria_admin (criado_em desc);

-- Limitador de requisicoes (funciona em serverless, onde nao ha memoria compartilhada)
create table limites_taxa (
  id        bigint generated always as identity primary key,
  chave     text not null,
  criado_em timestamptz not null default now()
);
create index limites_taxa_idx on limites_taxa (chave, criado_em desc);

-- ---------------------------------------------------------------------------
-- Clientes, parceiros e reservas
-- ---------------------------------------------------------------------------
create table clientes (
  id               integer generated always as identity primary key,
  nome             text not null check (char_length(nome) between 2 and 100),
  email            text not null check (email = lower(email) and char_length(email) <= 100),
  telefone         text not null check (char_length(telefone) between 8 and 20),
  idioma_preferido text not null default 'pt' check (idioma_preferido in ('pt', 'en', 'fr', 'es', 'de', 'it')),
  created_at       timestamptz not null default now()
);
create unique index clientes_email_uq on clientes (email);

create table parceiros (
  id                   integer generated always as identity primary key,
  nome                 text not null check (char_length(nome) between 2 and 100),
  email                text not null check (email = lower(email) and char_length(email) <= 100),
  telefone             text not null check (char_length(telefone) between 8 and 20),
  empresa              text not null check (char_length(empresa) between 2 and 150),
  cidade               text not null check (char_length(cidade) between 2 and 100),
  endereco             text not null check (char_length(endereco) between 3 and 200),
  site                 text check (site is null or char_length(site) <= 200),
  status               text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'inativo')),
  dados_pagamento      text,              -- IBAN / dados para repasse
  observacoes_internas text,
  aprovado_em          timestamptz,
  created_at           timestamptz not null default now()
);
create unique index parceiros_email_uq on parceiros (email);
create index parceiros_status_idx on parceiros (status);

-- Pagamento feito a um parceiro cobrindo corridas de um periodo
create table repasses (
  id             integer generated always as identity primary key,
  parceiro_id    integer not null references parceiros (id) on delete restrict,
  periodo_inicio date,
  periodo_fim    date,
  valor_total    numeric(10, 2) not null check (valor_total >= 0),
  metodo         text,
  observacao     text,
  pago_em        timestamptz not null default now(),
  criado_por_id  integer references admins (id) on delete set null
);
create index repasses_parceiro_idx on repasses (parceiro_id);

create table reservas (
  id                     integer generated always as identity primary key,
  -- Codigo publico (nao sequencial): usado pelo cliente no fluxo de pagamento
  codigo                 text not null unique check (char_length(codigo) = 10),
  cliente_id             integer not null references clientes (id) on delete restrict,
  -- Contato do passageiro NESTA viagem (pode diferir do cadastro do cliente)
  passageiro_nome        text not null check (char_length(passageiro_nome) between 2 and 100),
  passageiro_telefone    text not null check (char_length(passageiro_telefone) between 8 and 20),
  rota_id                integer not null references rotas (id) on delete restrict,
  veiculo_id             integer not null references veiculos (id) on delete restrict,
  tipo_trajeto           text not null default 'one_way' check (tipo_trajeto in ('one_way', 'return')),
  data_ida               timestamp not null,
  data_volta             timestamp,
  numero_voo             text check (numero_voo is null or char_length(numero_voo) <= 20),
  numero_voo_volta       text check (numero_voo_volta is null or char_length(numero_voo_volta) <= 20),
  quantidade_passageiros integer not null default 1 check (quantidade_passageiros between 1 and 20),
  observacoes            text check (observacoes is null or char_length(observacoes) <= 2000),
  preco_total            numeric(10, 2) not null check (preco_total >= 0),

  -- Ciclo operacional: pendente -> confirmado -> finalizado | cancelado
  status                 text not null default 'pendente' check (status in ('pendente', 'confirmado', 'finalizado', 'cancelado')),
  -- Ciclo financeiro do cliente: pendente -> parcial (sinal) -> pago
  status_pagamento       text not null default 'pendente' check (status_pagamento in ('pendente', 'parcial', 'pago')),
  tipo_pagamento         text check (tipo_pagamento is null or tipo_pagamento in ('sinal', 'integral', 'restante')),

  -- Parceiro que fara a viagem e quanto ele recebe por ela
  parceiro_id            integer references parceiros (id) on delete restrict,
  valor_parceiro         numeric(10, 2) check (valor_parceiro is null or valor_parceiro >= 0),
  repasse_id             integer references repasses (id) on delete set null,

  -- Enquanto nada foi pago, a reserva so "segura" o veiculo ate este instante
  -- (renovado a cada tentativa de pagamento). Depois disso outro cliente pode reservar.
  retido_ate             timestamptz not null default (now() + interval '30 minutes'),

  confirmado_em          timestamptz,
  finalizado_em          timestamptz,
  notas_internas         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  check (data_volta is null or data_volta > data_ida),
  check (tipo_trajeto <> 'return' or data_volta is not null)
);
create index reservas_veiculo_data_idx on reservas (veiculo_id, data_ida);
create index reservas_status_idx on reservas (status, status_pagamento);
create index reservas_cliente_idx on reservas (cliente_id);
create index reservas_parceiro_idx on reservas (parceiro_id) where parceiro_id is not null;

-- Dinheiro efetivamente recebido do cliente (SumUp automatico ou lancamento manual)
create table pagamentos (
  id                   integer generated always as identity primary key,
  reserva_id           integer not null references reservas (id) on delete cascade,
  valor                numeric(10, 2) not null check (valor > 0),
  moeda                text not null default 'EUR',
  metodo               text not null check (metodo in ('sumup_cartao', 'dinheiro', 'transferencia', 'outro')),
  tipo                 text check (tipo is null or tipo in ('sinal', 'integral', 'restante', 'outro')),
  origem               text not null default 'manual' check (origem in ('sumup', 'manual')),
  sumup_checkout_id    text,
  sumup_transaction_id text unique,
  observacao           text,
  pago_em              timestamptz not null default now()
);
create index pagamentos_reserva_idx on pagamentos (reserva_id);
create index pagamentos_data_idx on pagamentos (pago_em);

-- Cada tentativa de pagamento criada na SumUp (o cliente pode tentar mais de uma vez)
create table checkouts_sumup (
  id                 integer generated always as identity primary key,
  reserva_id         integer not null references reservas (id) on delete cascade,
  checkout_id        text not null unique,
  checkout_reference text not null,
  valor              numeric(10, 2) not null check (valor > 0),
  tipo               text not null check (tipo in ('sinal', 'integral', 'restante')),
  status             text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at         timestamptz not null default now()
);
create index checkouts_reserva_idx on checkouts_sumup (reserva_id);

-- Todo evento recebido no webhook (auditoria e depuracao)
create table pagamento_logs (
  id          bigint generated always as identity primary key,
  reserva_id  integer references reservas (id) on delete set null,
  evento      text not null,
  payload     text not null,
  recebido_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seguranca em nivel de linha: negar tudo, liberar so para app_server
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy app_server_total on public.%I for all to app_server using (true) with check (true)', t
    );
    execute format('grant select, insert, update, delete on public.%I to app_server', t);
  end loop;
end
$$;

grant usage on schema public to app_server;
grant usage, select on all sequences in schema public to app_server;

-- A API publica do Supabase (anon / authenticated) nao acessa nada.
do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all functions in schema public from anon;
  end if;
  if exists (select from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
  end if;
end
$$;

-- Tabelas futuras tambem nascem sem acesso publico.
alter default privileges in schema public revoke all on tables from public;
