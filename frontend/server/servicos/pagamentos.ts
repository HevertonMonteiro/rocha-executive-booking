import "server-only";
import type { Executor } from "../db/client";
import { consulta, transacao } from "../db/client";
import { deCentavos, paraCentavos, percentualDe } from "../dinheiro";
import { ErroHttp } from "../http";
import { sinalPercentual } from "./configuracoes";
import { config } from "../config";
import { consultarCheckoutSumup } from "./sumup";

export type MetodoPagamento = "sumup_cartao" | "dinheiro" | "transferencia" | "outro";
export type TipoPagamento = "sinal" | "integral" | "restante";

export interface ResumoFinanceiro {
  totalCentavos: number;
  recebidoCentavos: number;
  saldoCentavos: number;
}

export async function resumoFinanceiro(exec: Executor, reservaId: number): Promise<ResumoFinanceiro> {
  const [r] = await exec.query<{ total: string; recebido: string }>(
    `select r.preco_total as total,
            coalesce((select sum(p.valor) from pagamentos p where p.reserva_id = r.id), 0) as recebido
       from reservas r where r.id = $1`,
    [reservaId]
  );
  if (!r) throw new ErroHttp(404, "Reserva nao encontrada.");
  const total = paraCentavos(r.total);
  const recebido = paraCentavos(r.recebido);
  return { totalCentavos: total, recebidoCentavos: recebido, saldoCentavos: total - recebido };
}

/** Menor valor que o cliente precisa pagar para a reserva valer (X% do total, arredondado para cima). */
export async function sinalMinimoCentavos(totalCentavos: number, exec?: Executor): Promise<number> {
  return percentualDe(totalCentavos, await sinalPercentual(exec));
}

/**
 * A reserva so esta "concluida" quando o cliente pagou pelo menos o sinal minimo
 * (20% ou mais) ou o valor integral. Antes disso ela e apenas um pedido aguardando pagamento.
 */
export async function pagamentoMinimoAtingido(exec: Executor, reservaId: number) {
  const fin = await resumoFinanceiro(exec, reservaId);
  const minimoCentavos = await sinalMinimoCentavos(fin.totalCentavos, exec);
  return { ...fin, minimoCentavos, atingido: fin.recebidoCentavos >= minimoCentavos };
}

/** Quanto cobrar agora, conforme a opcao do cliente (sinal de X% ou integral). */
export async function valorDoCheckout(
  exec: Executor,
  reservaId: number,
  opcao: "sinal" | "integral"
): Promise<{ tipo: TipoPagamento; valorCentavos: number }> {
  const { totalCentavos, recebidoCentavos, saldoCentavos } = await resumoFinanceiro(exec, reservaId);
  if (saldoCentavos <= 0) throw new ErroHttp(409, "Esta reserva ja esta paga.", "RESERVA_PAGA");
  // Ja pagou o sinal: so resta cobrar o saldo.
  if (recebidoCentavos > 0) return { tipo: "restante", valorCentavos: saldoCentavos };
  if (opcao === "sinal") {
    const sinal = percentualDe(totalCentavos, await sinalPercentual(exec));
    if (sinal > 0 && sinal < totalCentavos) return { tipo: "sinal", valorCentavos: sinal };
  }
  return { tipo: "integral", valorCentavos: totalCentavos };
}

export interface NovoPagamento {
  reservaId: number;
  valorCentavos: number;
  metodo: MetodoPagamento;
  tipo: TipoPagamento | "outro" | null;
  origem: "sumup" | "manual";
  sumupCheckoutId?: string | null;
  sumupTransactionId?: string | null;
  observacao?: string | null;
}

/**
 * Registra dinheiro recebido e recalcula o status de pagamento da reserva.
 * Idempotente para pagamentos da SumUp (a mesma transacao nunca entra duas vezes).
 */
export async function registrarPagamento(
  tx: Executor,
  p: NovoPagamento
): Promise<{ duplicado: boolean; statusPagamento: string }> {
  // Trava a reserva: dois pagamentos simultaneos nao corrompem o saldo.
  const [reserva] = await tx.query<{ preco_total: string }>("select preco_total from reservas where id = $1 for update", [
    p.reservaId,
  ]);
  if (!reserva) throw new ErroHttp(404, "Reserva nao encontrada.");
  if (p.valorCentavos <= 0) throw new ErroHttp(422, "O valor deve ser maior que zero.");

  const inseridos = await tx.query(
    `insert into pagamentos (reserva_id, valor, metodo, tipo, origem, sumup_checkout_id, sumup_transaction_id, observacao)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (sumup_transaction_id) do nothing returning id`,
    [
      p.reservaId,
      deCentavos(p.valorCentavos),
      p.metodo,
      p.tipo,
      p.origem,
      p.sumupCheckoutId ?? null,
      p.sumupTransactionId ?? null,
      p.observacao ?? null,
    ]
  );
  const status = await recalcularStatusPagamento(tx, p.reservaId);
  return { duplicado: inseridos.length === 0, statusPagamento: status };
}

export async function recalcularStatusPagamento(tx: Executor, reservaId: number): Promise<string> {
  const { totalCentavos, recebidoCentavos } = await resumoFinanceiro(tx, reservaId);
  const status = recebidoCentavos >= totalCentavos ? "pago" : recebidoCentavos > 0 ? "parcial" : "pendente";
  await tx.query("update reservas set status_pagamento = $2, updated_at = now() where id = $1", [reservaId, status]);
  return status;
}

export type ResultadoConfirmacao =
  | { resultado: "desconhecido" }
  | { resultado: "ja_registrado" }
  | { resultado: "nao_pago" }
  | { resultado: "registrado"; reservaId: number; valorCentavos: number };

/**
 * Confirma um checkout consultando a SumUp e, se pago, registra automaticamente
 * o VALOR REALMENTE COBRADO. Usada pelo webhook e pela sincronizacao manual.
 */
export async function confirmarCheckoutPago(
  checkoutId: string,
  opcoes: { simulado?: boolean } = {}
): Promise<ResultadoConfirmacao> {
  const [checkout] = await consulta<{
    id: number;
    reserva_id: number;
    valor: string;
    tipo: TipoPagamento;
    status: string;
  }>("select id, reserva_id, valor, tipo, status from checkouts_sumup where checkout_id = $1", [checkoutId]);
  if (!checkout) return { resultado: "desconhecido" };
  if (checkout.status === "pago") return { resultado: "ja_registrado" };

  // Checkout de TESTE: so e aceito no endpoint de simulacao e apenas fora de production.
  const ehSimulado = checkoutId.startsWith("sim_");
  if (ehSimulado && !(opcoes.simulado && config.pagamentoSimulado)) return { resultado: "nao_pago" };
  const verificado = ehSimulado
    ? { pago: true, valorCentavos: paraCentavos(checkout.valor), moeda: "EUR", transacaoId: `sim-${checkoutId}` }
    : await consultarCheckoutSumup(checkoutId);
  if (!verificado || !verificado.pago || verificado.moeda !== "EUR") return { resultado: "nao_pago" };

  return transacao(async (tx) => {
    // Somente uma execucao "ganha" a transicao pendente -> pago.
    const marcado = await tx.query("update checkouts_sumup set status = 'pago' where id = $1 and status = 'pendente' returning id", [
      checkout.id,
    ]);
    if (!marcado.length) return { resultado: "ja_registrado" } as const;

    const esperado = paraCentavos(checkout.valor);
    const [reserva] = await tx.query<{ status: string }>("select status from reservas where id = $1", [checkout.reserva_id]);
    const avisos = [
      verificado.valorCentavos !== esperado
        ? `Atencao: valor cobrado (${deCentavos(verificado.valorCentavos)}) difere do esperado (${deCentavos(esperado)}).`
        : null,
      reserva?.status === "cancelado" ? "Atencao: pagamento recebido em reserva cancelada/expirada. Estorne ou reative a reserva." : null,
      ehSimulado ? "PAGAMENTO SIMULADO (ambiente de teste): nenhum valor real foi cobrado." : null,
    ].filter(Boolean);
    await registrarPagamento(tx, {
      reservaId: checkout.reserva_id,
      valorCentavos: verificado.valorCentavos,
      metodo: "sumup_cartao",
      tipo: checkout.tipo,
      origem: "sumup",
      sumupCheckoutId: checkoutId,
      sumupTransactionId: verificado.transacaoId,
      observacao: avisos.length ? avisos.join(" ") : null,
    });
    return { resultado: "registrado", reservaId: checkout.reserva_id, valorCentavos: verificado.valorCentavos } as const;
  });
}
