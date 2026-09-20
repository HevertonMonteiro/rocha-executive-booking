import { beforeAll, describe, expect, it } from "vitest";
import { consulta } from "@/server/db/client";
import { POST as criarPOST } from "@/app/api/reservas/criar/route";
import { POST as checkoutPOST } from "@/app/api/pagamentos/sumup/checkout/route";
import { POST as simuladoPOST } from "@/app/api/pagamentos/simulado/pagar/route";
import { POST as webhookPOST } from "@/app/api/webhook/sumup/route";
import { GET as statusGET } from "@/app/api/reservas/status/route";
import { config, garantirConfig } from "@/server/config";
import { dadosReserva, futuro, prepararBanco, requisicao } from "./ajuda";

const ctx = { params: {} };

beforeAll(async () => {
  await prepararBanco();
  process.env.PAGAMENTO_SIMULADO = "true";
});

const criar = async (dias: number) => (await (await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: futuro(dias), cliente_email: `sim${dias}@example.com` }) }), ctx)).json()).codigo as string;
const estado = async (codigo: string) => (await statusGET(requisicao(`/api/reservas/status?codigo=${codigo}`), ctx)).json();

describe("pagamento simulado (somente ambiente de teste)", () => {
  it("conclui a reserva sem SumUp: sinal de 20% -> concluida", async () => {
    const codigo = await criar(500);
    const c = await (await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "sinal" } }), ctx)).json();
    expect(c.checkout_id).toMatch(/^sim_[a-f0-9]{16}$/);
    const r = await simuladoPOST(requisicao("/api/pagamentos/simulado/pagar", { corpo: { checkout_id: c.checkout_id } }), ctx);
    expect((await r.json()).resultado).toBe("registrado");
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "parcial", concluida: true, pago: "13.00" });
    const [p] = await consulta("select observacao, origem from pagamentos p join reservas r on r.id = p.reserva_id where r.codigo = $1", [codigo]);
    expect(p.observacao).toContain("SIMULADO");
  });

  it("um checkout simulado nao pode ser confirmado por webhook forjado", async () => {
    const codigo = await criar(510);
    const c = await (await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "integral" } }), ctx)).json();
    await webhookPOST(requisicao("/api/webhook/sumup", { corpo: { event_type: "x", id: c.checkout_id } }), ctx);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pendente", concluida: false });
  });

  it("em production o modo simulado NUNCA funciona (endpoint 404 e config recusa iniciar)", async () => {
    const codigo = await criar(520);
    const c = await (await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "integral" } }), ctx)).json();

    const antes = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = "production";
    try {
      expect(config.pagamentoSimulado).toBe(false);
      const r = await simuladoPOST(requisicao("/api/pagamentos/simulado/pagar", { corpo: { checkout_id: c.checkout_id } }), ctx);
      // Sem PAGAMENTO_SIMULADO valido: 404 (endpoint inexistente) ou 500 (config insegura barrada no start).
      expect([404, 500]).toContain(r.status);
      expect(() => garantirConfig()).toThrow(); // PAGAMENTO_SIMULADO ligado impede o servidor de subir
    } finally {
      (process.env as Record<string, string>).NODE_ENV = antes!;
    }
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pendente" });
  });
});
