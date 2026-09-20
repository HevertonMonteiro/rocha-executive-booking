import "server-only";
import { z } from "zod";
import { crud } from "./crud";
import { SQL_PRECO_ROTA } from "./servicos/preco";

const texto = (max: number) => z.string().trim().min(1).max(max);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));
const dinheiro = z.number().min(0).max(100000);
const slug = z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, "use apenas letras minusculas, numeros e hifen");
// So aceitamos imagens do proprio site (/caminho) ou de https:// (ex.: Supabase Storage); "//host" e outros esquemas sao recusados.
const imagem = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"), "URL de imagem invalida")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const veiculos = crud({
  tabela: "veiculos",
  schema: z.object({
    nome: texto(60),
    slug,
    capacidade_passageiros: z.number().int().min(1).max(60),
    capacidade_malas: z.number().int().min(0).max(100),
    descricao: opcional(1000),
    imagem_url: imagem,
    preco_base: dinheiro,
    preco_por_km: dinheiro,
    ativo: z.boolean(),
  }),
  listar: "select * from veiculos order by preco_base, id",
  buscar: "select * from veiculos where id = $1",
});

export const regioes = crud({
  tabela: "regioes",
  schema: z.object({ nome: texto(100), slug }),
  listar: "select * from regioes order by nome",
  buscar: "select * from regioes where id = $1",
});

export const cidades = crud({
  tabela: "cidades",
  schema: z.object({
    regiao_id: z.number().int().positive(),
    nome: texto(100),
    tipo: z.enum(["aeroporto", "cidade", "parque", "estacao"]),
    codigo_iata: opcional(10),
  }),
  listar: `select c.*, g.nome as regiao from cidades c join regioes g on g.id = c.regiao_id order by g.nome, c.nome`,
  buscar: `select c.*, g.nome as regiao from cidades c join regioes g on g.id = c.regiao_id where c.id = $1`,
});

const SQL_ROTA = `select r.id, r.origem_id, r.destino_id, r.veiculo_id, o.nome as origem, d.nome as destino, v.nome as veiculo,
       r.preco_fixo, r.tempo_estimado_minutos, r.distancia_km, r.modo_preco, r.ativo, ${SQL_PRECO_ROTA} as preco_efetivo
  from rotas r join cidades o on o.id = r.origem_id join cidades d on d.id = r.destino_id join veiculos v on v.id = r.veiculo_id`;

export const rotas = crud({
  tabela: "rotas",
  schema: z.object({
    origem_id: z.number().int().positive(),
    destino_id: z.number().int().positive(),
    veiculo_id: z.number().int().positive(),
    preco_fixo: dinheiro,
    tempo_estimado_minutos: z.number().int().min(1).max(2000).nullable().optional(),
    distancia_km: z.number().min(0).max(5000).nullable().optional(),
    modo_preco: z.enum(["fixo", "km"]),
    ativo: z.boolean(),
  }),
  listar: `${SQL_ROTA} order by o.nome, d.nome, v.preco_base`,
  buscar: `${SQL_ROTA} where r.id = $1`,
});

const SQL_DESTINO = `select p.*, o.nome as origem, d.nome as destino from destinos_populares p
  join cidades o on o.id = p.origem_id join cidades d on d.id = p.destino_id`;

export const destinos = crud({
  tabela: "destinos_populares",
  schema: z.object({
    titulo: texto(150),
    descricao: opcional(300),
    etiqueta: opcional(60),
    imagem_url: imagem,
    origem_id: z.number().int().positive(),
    destino_id: z.number().int().positive(),
    ordem: z.number().int().min(0).max(1000),
    ativo: z.boolean(),
  }),
  listar: `${SQL_DESTINO} order by p.ordem, p.id`,
  buscar: `${SQL_DESTINO} where p.id = $1`,
});
