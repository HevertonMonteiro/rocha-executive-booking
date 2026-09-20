import { z } from "zod";
import { consulta } from "@/server/db/client";
import { ErroHttp, lerConsulta, publica } from "@/server/http";
import { pagamentoMinimoAtingido } from "@/server/servicos/pagamentos";
import { deCentavos } from "@/server/dinheiro";
import { obterBanco } from "@/server/db/client";

export const dynamic = "force-dynamic";

// Consulta publica pelo codigo (nao sequencial). Devolve so o necessario para a
// tela de confirmacao: nada de dados pessoais.
export const GET = publica(
  async ({ req }) => {
    const { codigo } = lerConsulta(req, z.object({ codigo: z.string().trim().length(10) }));
    const [r] = await consulta<{ id: number; status: string; status_pagamento: string; data_ida: string }>(
      "select id, status, status_pagamento, data_ida::text as data_ida from reservas where codigo = $1",
      [codigo.toUpperCase()]
    );
    if (!r) throw new ErroHttp(404, "Reserva nao encontrada.", "RESERVA_NAO_ENCONTRADA");
    const fin = await pagamentoMinimoAtingido(await obterBanco(), r.id);
    return {
      codigo: codigo.toUpperCase(),
      status: r.status,
      status_pagamento: r.status_pagamento,
      // true so quando o cliente pagou o sinal minimo (20%+) ou o total: a reserva esta concluida.
      concluida: fin.atingido,
      minimo: deCentavos(fin.minimoCentavos),
      total: deCentavos(fin.totalCentavos),
      pago: deCentavos(fin.recebidoCentavos),
      saldo: deCentavos(fin.saldoCentavos),
    };
  },
  { limite: { nome: "status", max: 60, janelaSeg: 60 } }
);
