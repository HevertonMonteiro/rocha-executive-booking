import { z } from "zod";
import { config } from "@/server/config";
import { ErroHttp, lerCorpo, publica } from "@/server/http";
import { confirmarCheckoutPago } from "@/server/servicos/pagamentos";

export const dynamic = "force-dynamic";

/**
 * SOMENTE PARA TESTES: aprova um checkout "sim_..." sem passar pela SumUp.
 * Fora de desenvolvimento (production) este endpoint nao existe (404).
 */
export const POST = publica(
  async ({ req }) => {
    if (!config.pagamentoSimulado) throw new ErroHttp(404, "Nao encontrado.");
    const { checkout_id } = await lerCorpo(req, z.object({ checkout_id: z.string().trim().regex(/^sim_[a-f0-9]{16}$/) }));
    const r = await confirmarCheckoutPago(checkout_id, { simulado: true });
    return { resultado: r.resultado };
  },
  { limite: { nome: "simulado", max: 30, janelaSeg: 600 } }
);
