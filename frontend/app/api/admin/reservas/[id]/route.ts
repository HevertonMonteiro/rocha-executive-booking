import { z } from "zod";
import { consulta, obterBanco, transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, idDe, lerCorpo } from "@/server/http";
import { exigir, SQL_RESERVA_RESUMO } from "@/server/servicos/admin";
import { sugerirProximoHorario, verificarDisponibilidade } from "@/server/servicos/disponibilidade";
import { resumoFinanceiro } from "@/server/servicos/pagamentos";
import { formatarDataFrancesa } from "@/server/servicos/reservas";
import { deCentavos } from "@/server/dinheiro";

export const dynamic = "force-dynamic";

const DETALHE = SQL_RESERVA_RESUMO.replace(
  "select r.id,",
  `select r.observacoes, r.notas_internas, r.numero_voo_volta, r.confirmado_em::text as confirmado_em,
         r.finalizado_em::text as finalizado_em, r.updated_at::text as updated_at,
         c.nome as cliente_nome, c.telefone as cliente_telefone, ro.tempo_estimado_minutos,
         r.veiculo_id, r.rota_id, r.id,`
);

export const GET = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const banco = await obterBanco();
  const [reserva] = await consulta(`${DETALHE} where r.id = $1`, [id]);
  exigir(reserva, "Reserva nao encontrada.");
  const pagamentos = await consulta(
    "select id, valor, metodo, tipo, origem, observacao, sumup_transaction_id, pago_em::text as pago_em from pagamentos where reserva_id = $1 order by pago_em, id",
    [id]
  );
  const checkouts = await consulta(
    "select checkout_id, valor, tipo, status, created_at::text as created_at from checkouts_sumup where reserva_id = $1 order by id desc",
    [id]
  );
  const fin = await resumoFinanceiro(banco, id);
  return {
    ...reserva,
    pagamentos,
    checkouts,
    financeiro: {
      total: deCentavos(fin.totalCentavos),
      recebido: deCentavos(fin.recebidoCentavos),
      saldo: deCentavos(fin.saldoCentavos),
    },
  };
});

const dataHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)
  .transform((v) => (v.length === 16 ? `${v}:00` : v));

const schemaEdicao = z.object({
  notas_internas: z.string().max(4000).nullable().optional(),
  numero_voo: z.string().trim().max(20).nullable().optional(),
  numero_voo_volta: z.string().trim().max(20).nullable().optional(),
  passageiro_nome: z.string().trim().min(2).max(100).optional(),
  passageiro_telefone: z.string().trim().min(8).max(20).optional(),
  quantidade_passageiros: z.number().int().min(1).max(20).optional(),
  valor_parceiro: z.number().min(0).max(100000).optional(),
  data_ida: dataHora.optional(),
  data_volta: dataHora.nullable().optional(),
});

// Edicao de dados da reserva; remarcar (data) revalida a agenda do veiculo.
export const PATCH = comAdmin(async (ctx) => {
  const id = idDe(ctx);
  const d = await lerCorpo(ctx.req, schemaEdicao);
  return transacao(async (tx) => {
    const [r] = await tx.query<any>(
      `select r.status, r.tipo_trajeto, r.veiculo_id, r.repasse_id, r.data_ida::text as data_ida_t, r.data_volta::text as data_volta_t,
              ro.tempo_estimado_minutos as tempo, v.capacidade_passageiros
         from reservas r join rotas ro on ro.id = r.rota_id join veiculos v on v.id = r.veiculo_id
        where r.id = $1 for update of r`,
      [id]
    );
    exigir(r, "Reserva nao encontrada.");
    if (["finalizado", "cancelado"].includes(r.status) && (d.data_ida || d.data_volta !== undefined))
      throw new ErroHttp(409, "Nao e possivel remarcar uma reserva finalizada ou cancelada.");
    if (d.valor_parceiro !== undefined && r.repasse_id) throw new ErroHttp(409, "Esta corrida ja foi paga ao parceiro.");
    if (d.quantidade_passageiros && d.quantidade_passageiros > r.capacidade_passageiros)
      throw new ErroHttp(422, `Este veiculo comporta ate ${r.capacidade_passageiros} passageiros.`);

    const novaIda = d.data_ida ?? r.data_ida_t.replace(" ", "T");
    const novaVolta = d.data_volta !== undefined ? d.data_volta : r.data_volta_t ? r.data_volta_t.replace(" ", "T") : null;
    if (r.tipo_trajeto === "return" && !novaVolta) throw new ErroHttp(422, "Ida e volta exige data de volta.");
    if (novaVolta && novaVolta <= novaIda) throw new ErroHttp(422, "A volta deve ser posterior a ida.");

    if (d.data_ida || d.data_volta !== undefined) {
      await tx.query("select pg_advisory_xact_lock(1001, $1::int)", [r.veiculo_id]);
      const pedido = { dataIda: novaIda, tempoEstimadoMinutos: r.tempo, tipoTrajeto: r.tipo_trajeto, dataVolta: novaVolta };
      if (!(await verificarDisponibilidade(tx, r.veiculo_id, pedido, id))) {
        const proximo = await sugerirProximoHorario(tx, r.veiculo_id, pedido, id);
        throw new ErroHttp(409, `Veiculo indisponivel nesse horario.${proximo ? ` Proximo horario livre: ${formatarDataFrancesa(proximo)}.` : ""}`);
      }
    }

    const campos: Record<string, unknown> = {
      notas_internas: d.notas_internas,
      numero_voo: d.numero_voo === undefined ? undefined : d.numero_voo || null,
      numero_voo_volta: d.numero_voo_volta === undefined ? undefined : d.numero_voo_volta || null,
      passageiro_nome: d.passageiro_nome,
      passageiro_telefone: d.passageiro_telefone,
      quantidade_passageiros: d.quantidade_passageiros,
      valor_parceiro: d.valor_parceiro,
      data_ida: d.data_ida,
      data_volta: d.data_volta,
    };
    const colunas = Object.keys(campos).filter((c) => campos[c] !== undefined);
    if (!colunas.length) return { ok: true };
    await tx.query(
      `update reservas set ${colunas.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now() where id = $1`,
      [id, ...colunas.map((c) => campos[c])]
    );
    return { ok: true };
  });
});
