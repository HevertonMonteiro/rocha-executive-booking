import { randomBytes } from "node:crypto";
import { consulta, transacao } from "@/server/db/client";
import { config } from "@/server/config";
import { deCentavos } from "@/server/dinheiro";
import { ErroHttp, lerCorpo, publica } from "@/server/http";
import { schemaCheckout } from "@/server/schemas";
import { sugerirProximoHorario, verificarDisponibilidade, type TipoTrajeto } from "@/server/servicos/disponibilidade";
import { valorDoCheckout } from "@/server/servicos/pagamentos";
import { criarCheckoutSumup } from "@/server/servicos/sumup";
import { paraIso } from "@/server/tempo";

export const dynamic = "force-dynamic";

/**
 * Cria a cobranca NO SERVIDOR. O cliente so escolhe "sinal" ou "integral": o
 * valor exato (>= sinal minimo) e calculado aqui e nunca aceito do navegador.
 */
export const POST = publica(
  async ({ req }) => {
    const { codigo: codigoBruto, opcao } = await lerCorpo(req, schemaCheckout);
    const codigo = codigoBruto.toUpperCase();

    const cobranca = await transacao(async (tx) => {
      const [r] = await tx.query<{
        id: number;
        status: string;
        status_pagamento: string;
        veiculo_id: number;
        tipo_trajeto: TipoTrajeto;
        data_ida: string;
        data_volta: string | null;
        tempo: number | null;
      }>(
        `select r.id, r.status, r.status_pagamento, r.veiculo_id, r.tipo_trajeto, r.data_ida::text as data_ida,
                r.data_volta::text as data_volta, ro.tempo_estimado_minutos as tempo
           from reservas r join rotas ro on ro.id = r.rota_id
          where r.codigo = $1 for update of r`,
        [codigo]
      );
      if (!r) throw new ErroHttp(404, "Reserva nao encontrada.", "RESERVA_NAO_ENCONTRADA");
      if (r.status === "cancelado") throw new ErroHttp(409, "Esta reserva foi cancelada.", "RESERVA_CANCELADA");

      const valor = await valorDoCheckout(tx, r.id, opcao);

      // Ainda nada pago: o horario so vale se continuar livre. Se a retencao expirou e outro
      // cliente ja reservou, o pagamento e recusado ANTES de cobrar.
      if (r.status_pagamento === "pendente") {
        await tx.query("select pg_advisory_xact_lock(1001, $1::int)", [r.veiculo_id]);
        const pedido = { dataIda: r.data_ida.replace(" ", "T"), tempoEstimadoMinutos: r.tempo, tipoTrajeto: r.tipo_trajeto, dataVolta: r.data_volta?.replace(" ", "T") ?? null };
        if (!(await verificarDisponibilidade(tx, r.veiculo_id, pedido, r.id))) {
          const proximo = await sugerirProximoHorario(tx, r.veiculo_id, pedido, r.id);
          throw new ErroHttp(409, "Este veiculo nao esta mais disponivel nesse horario.", "INDISPONIVEL", { proximo: paraIso(proximo) });
        }
        // Renova a retencao enquanto o cliente paga (3D Secure pode demorar).
        await tx.query(
          "update reservas set retido_ate = greatest(retido_ate, now() + make_interval(mins => $2::int)), updated_at = now() where id = $1",
          [r.id, config.holdPendenteMinutos]
        );
      }
      return { reservaId: r.id, ...valor };
    });

    // A SumUp rejeita checkout_reference duplicado: unico por tentativa.
    const referencia = `ROCHA-${codigo}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const checkoutId = await criarCheckoutSumup({
      referencia,
      valorCentavos: cobranca.valorCentavos,
      descricao: `Reserva ${codigo} - Rocha Executive Transport`,
      redirectUrl: `${config.siteUrl}/reserva/sucesso?codigo=${codigo}`,
    });
    await consulta(
      "insert into checkouts_sumup (reserva_id, checkout_id, checkout_reference, valor, tipo) values ($1,$2,$3,$4,$5)",
      [cobranca.reservaId, checkoutId, referencia, deCentavos(cobranca.valorCentavos), cobranca.tipo]
    );
    await consulta("update reservas set tipo_pagamento = $2, updated_at = now() where id = $1", [cobranca.reservaId, cobranca.tipo]);
    return { checkout_id: checkoutId, tipo: cobranca.tipo, valor: deCentavos(cobranca.valorCentavos) };
  },
  { limite: { nome: "checkout", max: 15, janelaSeg: 600 } }
);
