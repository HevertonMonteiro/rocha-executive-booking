import { consulta } from "@/server/db/client";
import { publica } from "@/server/http";
import { confirmarCheckoutPago } from "@/server/servicos/pagamentos";

export const dynamic = "force-dynamic";

/**
 * Webhook da SumUp. Nunca confiamos no conteudo recebido: extraimos apenas o id
 * do checkout e confirmamos o pagamento consultando a API da SumUp. Sempre
 * responde 200 (senao a SumUp reenvia indefinidamente).
 */
export const POST = publica(
  async ({ req }) => {
    let corpo: any = {};
    try {
      const texto = await req.text();
      if (texto.length <= 50_000) corpo = JSON.parse(texto);
    } catch {
      /* corpo invalido: ignora */
    }
    const checkoutId = String(corpo?.id ?? corpo?.checkout_id ?? corpo?.payload?.checkout_id ?? "").slice(0, 100);

    let reservaId: number | null = null;
    if (checkoutId) {
      const [c] = await consulta<{ reserva_id: number }>("select reserva_id from checkouts_sumup where checkout_id = $1", [
        checkoutId,
      ]);
      reservaId = c?.reserva_id ?? null;
    }
    await consulta("insert into pagamento_logs (reserva_id, evento, payload) values ($1, $2, $3)", [
      reservaId,
      String(corpo?.event_type ?? "desconhecido").slice(0, 50),
      JSON.stringify(corpo).slice(0, 20_000),
    ]);

    if (checkoutId) await confirmarCheckoutPago(checkoutId);
    return { received: true };
  },
  { limite: { nome: "webhook", max: 120, janelaSeg: 60 } }
);
