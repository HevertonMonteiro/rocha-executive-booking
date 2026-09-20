-- =============================================================================
-- Conteudo inicial do site (regioes, cidades, frota, rotas, destinos, empresa).
-- Rode manualmente e de forma consciente; NAO faz parte das migracoes.
-- Idempotente: so insere se ainda nao houver regioes cadastradas.
-- =============================================================================
do $$
declare
  idf int; bdr int; am int;
  cdg int; ory int; paris int; disney int; versailles int; gare_nord int;
  mrs int; marseille int; aix int; st_charles int;
  nce int; nice int; cannes int; antibes int;
  hatch int; sedan int; van int;
begin
  if exists (select from regioes) then
    raise notice 'Banco ja populado. Seed ignorado.';
    return;
  end if;

  insert into regioes (nome, slug) values ('Île-de-France', 'ile-de-france') returning id into idf;
  insert into regioes (nome, slug) values ('Bouches-du-Rhône', 'bouches-du-rhone') returning id into bdr;
  insert into regioes (nome, slug) values ('Alpes-Maritimes', 'alpes-maritimes') returning id into am;

  insert into cidades (regiao_id, nome, tipo, codigo_iata) values (idf, 'Aéroport Charles-de-Gaulle (CDG)', 'aeroporto', 'CDG') returning id into cdg;
  insert into cidades (regiao_id, nome, tipo, codigo_iata) values (idf, 'Aéroport d''Orly (ORY)', 'aeroporto', 'ORY') returning id into ory;
  insert into cidades (regiao_id, nome, tipo) values (idf, 'Paris (Centre)', 'cidade') returning id into paris;
  insert into cidades (regiao_id, nome, tipo) values (idf, 'Disneyland Paris', 'parque') returning id into disney;
  insert into cidades (regiao_id, nome, tipo) values (idf, 'Versailles', 'cidade') returning id into versailles;
  insert into cidades (regiao_id, nome, tipo) values (idf, 'Gare du Nord (Paris)', 'estacao') returning id into gare_nord;
  insert into cidades (regiao_id, nome, tipo, codigo_iata) values (bdr, 'Aéroport Marseille Provence (MRS)', 'aeroporto', 'MRS') returning id into mrs;
  insert into cidades (regiao_id, nome, tipo) values (bdr, 'Marseille (Centre)', 'cidade') returning id into marseille;
  insert into cidades (regiao_id, nome, tipo) values (bdr, 'Aix-en-Provence', 'cidade') returning id into aix;
  insert into cidades (regiao_id, nome, tipo) values (bdr, 'Gare Saint-Charles (Marseille)', 'estacao') returning id into st_charles;
  insert into cidades (regiao_id, nome, tipo, codigo_iata) values (am, 'Aéroport Nice Côte d''Azur (NCE)', 'aeroporto', 'NCE') returning id into nce;
  insert into cidades (regiao_id, nome, tipo) values (am, 'Nice (Centre)', 'cidade') returning id into nice;
  insert into cidades (regiao_id, nome, tipo) values (am, 'Cannes', 'cidade') returning id into cannes;
  insert into cidades (regiao_id, nome, tipo) values (am, 'Antibes', 'cidade') returning id into antibes;

  insert into veiculos (nome, slug, capacidade_passageiros, capacidade_malas, descricao, imagem_url, preco_base, preco_por_km)
  values ('Toyota Hatchback', 'toyota-hatchback', 4, 3, 'Option économique et confortable pour jusqu''à 4 passagers.', '/images/vehicles/toyota-hatchback.jpg', 45, 1.8) returning id into hatch;
  insert into veiculos (nome, slug, capacidade_passageiros, capacidade_malas, descricao, imagem_url, preco_base, preco_por_km)
  values ('Mercedes Sedan', 'mercedes-sedan', 3, 3, 'Berline executive Mercedes-Benz avec chauffeur bilingue.', '/images/vehicles/mercedes-sedan.jpg', 65, 2.4) returning id into sedan;
  insert into veiculos (nome, slug, capacidade_passageiros, capacidade_malas, descricao, imagem_url, preco_base, preco_por_km)
  values ('Mercedes Van', 'mercedes-van', 8, 10, 'Van premium pour groupes jusqu''à 8 passagers avec bagages.', '/images/vehicles/mercedes-van.jpg', 85, 3.0) returning id into van;

  -- Rotas: (origem, destino, preco hatch, sedan, van, minutos)
  create temporary table _rotas (o int, d int, p1 numeric, p2 numeric, p3 numeric, min int) on commit drop;
  insert into _rotas values
    (cdg, paris, 65, 90, 110, 45), (paris, cdg, 65, 90, 110, 45),
    (ory, paris, 55, 80, 100, 40), (paris, ory, 55, 80, 100, 40),
    (cdg, disney, 85, 115, 140, 50), (disney, cdg, 85, 115, 140, 50),
    (cdg, versailles, 95, 125, 150, 60),
    (nce, cannes, 80, 110, 130, 40), (cannes, nce, 80, 110, 130, 40),
    (nce, nice, 45, 65, 85, 20), (nice, nce, 45, 65, 85, 20),
    (nce, antibes, 60, 85, 105, 30),
    (mrs, aix, 65, 90, 110, 35), (aix, mrs, 65, 90, 110, 35),
    (mrs, marseille, 50, 70, 90, 25), (marseille, mrs, 50, 70, 90, 25);

  insert into rotas (origem_id, destino_id, veiculo_id, preco_fixo, tempo_estimado_minutos)
  select o, d, hatch, p1, min from _rotas
  union all select o, d, sedan, p2, min from _rotas
  union all select o, d, van, p3, min from _rotas;

  insert into destinos_populares (titulo, descricao, etiqueta, imagem_url, origem_id, destino_id, ordem) values
    ('Aéroport CDG ➔ Paris Centre', 'Hôtels, centre historique, Champs-Élysées et Tour Eiffel avec chauffeur exclusif.', 'Île-de-France', '/images/destinations/paris.jpg', cdg, paris, 1),
    ('Aéroport CDG ➔ Disneyland', 'Transport direct vers les hôtels Disney avec aide pour tous les bagages.', 'Parcs à thème', '/images/destinations/disney.jpg', cdg, disney, 2),
    ('Aéroport Nice (NCE) ➔ Cannes', 'Arrivez avec élégance aux palaces de la Croisette et du littoral méditerranéen.', 'Côte d''Azur', '/images/destinations/cannes_nice.jpg', nce, cannes, 3),
    ('Aéroport MRS ➔ Marseille', 'Accès rapide au port de croisières, au centre historique et à Aix-en-Provence.', 'Provence', '/images/destinations/marseille.jpg', mrs, marseille, 4);

  insert into configuracoes (chave, valor) values
    ('empresa_nome', 'Rocha Executive Transport'),
    ('whatsapp_numero', '33783078111'),
    ('whatsapp_exibicao', '+33 7 83 07 81 11'),
    ('email_contato', ''),
    ('endereco', ''),
    ('siret', ''),
    ('instagram_url', ''),
    ('facebook_url', ''),
    ('sinal_percentual', '20');
end
$$;
