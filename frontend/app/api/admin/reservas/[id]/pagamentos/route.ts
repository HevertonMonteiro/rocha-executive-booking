import { z } from "zod";
import { transacao } from "@/server/db/client";
import { paraCentavos } from "@/server/dinheiro";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { registrarPagamento, resumoFinanceiro } from "@/server/servicos/pagamentos";

export const dynamic = "force-dynamic";

const schema = z.object({
  valor: z.number().positive().max(100000),
  metodo: z.enum(["dinheiro", "transferencia", "sumup_cartao", "outro"]),
  tipo: z.enum(["sinal", "restante", "integral", "outro"]).optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
});

// Lancamento manual (dinheiro na viagem, transferencia, cartao pela maquininha...).
export const POST = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schema);
  return transacao(async (tx) => {
    const fin = await resumoFinanceiro(tx, id);
    const valor = paraCentavos(d.valor);
    if (valor > fin.saldoCentavos) throw new ErroHttp(422, "O valor excede o saldo em aberto da reserva.");
    const r = await registrarPagamento(tx, {
      reservaId: id,
      valorCentavos: valor,
      metodo: d.metodo,
      tipo: d.tipo ?? (valor === fin.saldoCentavos ? "restante" : "outro"),
      origem: "manual",
      observacao: d.observacao ?? null,
    });
    return { ok: true, status_pagamento: r.statusPagamento };
  });
});
