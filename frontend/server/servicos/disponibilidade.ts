import "server-only";
import type { Executor } from "../db/client";
import { config } from "../config";
import { deMs, paraMs } from "../tempo";

export type TipoTrajeto = "one_way" | "return";

const MIN = 60_000;
const DIA = 24 * 60 * MIN;

export interface Janela {
  inicio: number;
  fim: number;
}

export interface PedidoViagem {
  dataIda: string;
  tempoEstimadoMinutos: number | null;
  tipoTrajeto: TipoTrajeto;
  dataVolta?: string | null;
}

/**
 * Intervalo em que o veiculo fica indisponivel para outras reservas.
 * Regra: depois de deixar o passageiro o veiculo precisa voltar ao ponto de
 * partida (mesma duracao da viagem) mais uma margem de seguranca.
 */
export function janelaOcupacao(p: PedidoViagem): Janela {
  const inicio = paraMs(p.dataIda);
  const duracao = (p.tempoEstimadoMinutos ?? 0) * MIN;
  const margem = config.margemRetornoMinutos * MIN;
  if (p.tipoTrajeto === "return" && p.dataVolta) {
    return { inicio, fim: paraMs(p.dataVolta) + duracao + margem };
  }
  return { inicio, fim: inicio + duracao * 2 + margem };
}

const sobrepoe = (a: Janela, b: Janela) => a.inicio < b.fim && b.inicio < a.fim;

/** Janelas de reservas que seguram o veiculo perto da data pedida. */
async function janelasDoVeiculo(
  exec: Executor,
  veiculoId: number,
  dataIda: string,
  excluirReservaId?: number
): Promise<Janela[]> {
  const linhas = await exec.query<{
    data_ida: string;
    data_volta: string | null;
    tipo_trajeto: TipoTrajeto;
    tempo: number | null;
  }>(
    `select r.data_ida::text as data_ida, r.data_volta::text as data_volta, r.tipo_trajeto,
            ro.tempo_estimado_minutos as tempo
       from reservas r join rotas ro on ro.id = r.rota_id
      where r.veiculo_id = $1
        and r.status in ('pendente', 'confirmado', 'finalizado')
        -- reserva criada e nao paga deixa de segurar o veiculo depois do prazo de retencao
        and not (r.status = 'pendente' and r.status_pagamento = 'pendente' and r.retido_ate < now())
        and r.data_ida between $2::timestamp - interval '3 days' and $2::timestamp + interval '30 days'
        and ($3::int is null or r.id <> $3::int)`,
    [veiculoId, dataIda, excluirReservaId ?? null]
  );
  return linhas.map((l) =>
    janelaOcupacao({
      dataIda: l.data_ida,
      tempoEstimadoMinutos: l.tempo,
      tipoTrajeto: l.tipo_trajeto,
      dataVolta: l.data_volta,
    })
  );
}

export async function verificarDisponibilidade(
  exec: Executor,
  veiculoId: number,
  pedido: PedidoViagem,
  excluirReservaId?: number
): Promise<boolean> {
  const janelas = await janelasDoVeiculo(exec, veiculoId, pedido.dataIda, excluirReservaId);
  const solicitada = janelaOcupacao(pedido);
  return !janelas.some((j) => sobrepoe(solicitada, j));
}

/** Proximo horario livre: pula por cima de cada janela conflitante ate achar folga. */
export async function sugerirProximoHorario(
  exec: Executor,
  veiculoId: number,
  pedido: PedidoViagem,
  excluirReservaId?: number
): Promise<string | null> {
  const janelas = (await janelasDoVeiculo(exec, veiculoId, pedido.dataIda, excluirReservaId)).sort(
    (a, b) => a.inicio - b.inicio
  );
  const duracaoPedido =
    pedido.tipoTrajeto === "return" && pedido.dataVolta ? paraMs(pedido.dataVolta) - paraMs(pedido.dataIda) : null;

  let candidatoIda = paraMs(pedido.dataIda);
  const limite = candidatoIda + 30 * DIA;
  for (let i = 0; i < 60 && candidatoIda <= limite; i++) {
    const candidata = janelaOcupacao({
      ...pedido,
      dataIda: deMs(candidatoIda),
      dataVolta: duracaoPedido !== null ? deMs(candidatoIda + duracaoPedido) : null,
    });
    const conflito = janelas.find((j) => sobrepoe(candidata, j));
    if (!conflito) return deMs(candidatoIda);
    candidatoIda = conflito.fim;
  }
  return null;
}

/** Reservas do parceiro que se sobrepoem a uma viagem (aviso ao destinar, nao bloqueia). */
export async function conflitosDoParceiro(exec: Executor, parceiroId: number, reservaId: number): Promise<string[]> {
  const [alvo] = await exec.query<{ data_ida: string; data_volta: string | null; tipo_trajeto: TipoTrajeto; tempo: number | null }>(
    `select r.data_ida::text as data_ida, r.data_volta::text as data_volta, r.tipo_trajeto, ro.tempo_estimado_minutos as tempo
       from reservas r join rotas ro on ro.id = r.rota_id where r.id = $1`,
    [reservaId]
  );
  if (!alvo) return [];
  const janelaAlvo = janelaOcupacao({ dataIda: alvo.data_ida, tempoEstimadoMinutos: alvo.tempo, tipoTrajeto: alvo.tipo_trajeto, dataVolta: alvo.data_volta });
  const outras = await exec.query<{ codigo: string; data_ida: string; data_volta: string | null; tipo_trajeto: TipoTrajeto; tempo: number | null }>(
    `select r.codigo, r.data_ida::text as data_ida, r.data_volta::text as data_volta, r.tipo_trajeto, ro.tempo_estimado_minutos as tempo
       from reservas r join rotas ro on ro.id = r.rota_id
      where r.parceiro_id = $1 and r.id <> $2 and r.status in ('pendente', 'confirmado')
        and r.data_ida between $3::timestamp - interval '3 days' and $3::timestamp + interval '3 days'`,
    [parceiroId, reservaId, alvo.data_ida]
  );
  return outras
    .filter((o) => sobrepoe(janelaAlvo, janelaOcupacao({ dataIda: o.data_ida, tempoEstimadoMinutos: o.tempo, tipoTrajeto: o.tipo_trajeto, dataVolta: o.data_volta })))
    .map((o) => o.codigo);
}
