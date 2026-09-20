import "server-only";
import { consulta } from "../db/client";
import { lerConfiguracoes } from "./configuracoes";
import { SQL_PRECO_ROTA } from "./preco";

export interface DestinoPopular {
  id: number;
  titulo: string;
  descricao: string | null;
  etiqueta: string | null;
  imagem_url: string | null;
  origem_id: number;
  destino_id: number;
  preco_a_partir: string | null;
  tempo_minutos: number | null;
}

export interface VeiculoPublico {
  id: number;
  nome: string;
  slug: string;
  capacidade_passageiros: number;
  capacidade_malas: number;
  descricao: string | null;
  imagem_url: string | null;
}

// Preco "a partir de" e tempo saem das rotas ativas: mudou a rota, mudou o card.
export function listarDestinosPopulares(): Promise<DestinoPopular[]> {
  return consulta<DestinoPopular>(
    `select p.id, p.titulo, p.descricao, p.etiqueta, p.imagem_url, p.origem_id, p.destino_id,
            (select min(${SQL_PRECO_ROTA}) from rotas r join veiculos v on v.id = r.veiculo_id and v.ativo
              where r.origem_id = p.origem_id and r.destino_id = p.destino_id and r.ativo) as preco_a_partir,
            (select min(r.tempo_estimado_minutos) from rotas r
              where r.origem_id = p.origem_id and r.destino_id = p.destino_id and r.ativo) as tempo_minutos
       from destinos_populares p where p.ativo order by p.ordem, p.id`
  );
}

export function listarVeiculosAtivos(): Promise<VeiculoPublico[]> {
  return consulta<VeiculoPublico>(
    `select id, nome, slug, capacidade_passageiros, capacidade_malas, descricao, imagem_url
       from veiculos where ativo order by preco_base, id`
  );
}

/** Dados que aparecem em todas as paginas. Se o banco estiver fora, o site segue no ar com padroes. */
export async function carregarDadosPublicos() {
  try {
    const [dados, veiculos, destinos] = await Promise.all([lerConfiguracoes(true), listarVeiculosAtivos(), listarDestinosPopulares()]);
    return { dados, veiculos, destinos };
  } catch (e) {
    console.error("[publico] falha ao carregar dados do site:", e instanceof Error ? e.message : e);
    return { dados: {} as Record<string, string>, veiculos: [] as VeiculoPublico[], destinos: [] as DestinoPopular[] };
  }
}
