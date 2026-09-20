import { z } from "zod";
import { consulta } from "@/server/db/client";
import { ErroHttp, lerCorpo, publica } from "@/server/http";
import { confirmarCheckoutPago } from "@/server/servicos/pagamentos";

export const dynamic = "force-dynamic";

// Reconcilia os checkouts pendentes de uma reserva com a SumUp (caso o webhook demore).
export const POST = publica(
  async ({ req }) => {
    const { codigo } = await lerCorpo(req, z.object({ codigo: z.string().trim().length(10) }));
    const pendentes = await consulta<{ checkout_id: string }>(
      `select c.checkout_id from checkouts_sumup c join reservas r on r.id = c.reserva_id
        where r.codigo = $1 and c.status = 'pendente'`,
      [codigo.toUpperCase()]
    );
    let registrados = 0;
    for (const p of pendentes) {
      const res = await confirmarCheckoutPago(p.checkout_id);
      if (res.resultado === "registrado") registrados++;
    }
    return { registrados };
  },
  { limite: { nome: "sync", max: 20, janelaSeg: 600 } }
);
