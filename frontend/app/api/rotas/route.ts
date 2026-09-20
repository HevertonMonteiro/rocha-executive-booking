import { consulta } from "@/server/db/client";
import { ErroHttp, lerConsulta, publica } from "@/server/http";
import { schemaConsultaRotas } from "@/server/schemas";
import { sugerirProximoHorario, verificarDisponibilidade } from "@/server/servicos/disponibilidade";
import { SQL_PRECO_ROTA } from "@/server/servicos/preco";
import { obterBanco } from "@/server/db/client";
import { paraIso } from "@/server/tempo";

export const dynamic = "force-dynamic";

export const GET = publica(async ({ req }) => {
  const q = lerConsulta(req, schemaConsultaRotas);
  if (q.origem_id === q.destino_id) throw new ErroHttp(400, "Origem e destino devem ser diferentes.", "DADOS_INVALIDOS");

  const rotas = await consulta(
    `select r.id, r.tempo_estimado_minutos, ${SQL_PRECO_ROTA} as preco_fixo,
            o.id as o_id, o.nome as o_nome, o.codigo_iata as o_iata,
            d.id as d_id, d.nome as d_nome, d.codigo_iata as d_iata,
            v.id as v_id, v.nome as v_nome, v.slug as v_slug, v.capacidade_passageiros, v.capacidade_malas,
            v.descricao as v_descricao, v.imagem_url as v_imagem
       from rotas r
       join veiculos v on v.id = r.veiculo_id and v.ativo
       join cidades o on o.id = r.origem_id
       join cidades d on d.id = r.destino_id
      where r.origem_id = $1 and r.destino_id = $2 and r.ativo
      order by ${SQL_PRECO_ROTA} asc`,
    [q.origem_id, q.destino_id]
  );
  if (!rotas.length) throw new ErroHttp(404, "Nenhuma rota disponivel para esta combinacao de origem/destino.", "SEM_ROTA");

  const banco = await obterBanco();
  const consultarAgenda = Boolean(q.data_ida);
  const saida = [];
  for (const r of rotas) {
    const item: Record<string, unknown> = {
      id: r.id,
      origem: { id: r.o_id, nome: r.o_nome, codigo_iata: r.o_iata },
      destino: { id: r.d_id, nome: r.d_nome, codigo_iata: r.d_iata },
      veiculo: {
        id: r.v_id,
        nome: r.v_nome,
        slug: r.v_slug,
        capacidade_passageiros: r.capacidade_passageiros,
        capacidade_malas: r.capacidade_malas,
        descricao: r.v_descricao,
        imagem_url: r.v_imagem,
      },
      preco_fixo: r.preco_fixo,
      tempo_estimado_minutos: r.tempo_estimado_minutos,
      disponivel: null,
      proximo_horario_disponivel: null,
    };
    if (consultarAgenda) {
      const pedido = {
        dataIda: q.data_ida!,
        tempoEstimadoMinutos: r.tempo_estimado_minutos,
        tipoTrajeto: q.tipo_trajeto,
        dataVolta: q.data_volta ?? null,
      };
      const livre = await verificarDisponibilidade(banco, r.v_id, pedido);
      item.disponivel = livre;
      if (!livre) item.proximo_horario_disponivel = paraIso(await sugerirProximoHorario(banco, r.v_id, pedido));
    }
    saida.push(item);
  }
  return saida;
});
