import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/servicos/sumup", () => ({
  criarCheckoutSumup: vi.fn(),
  consultarCheckoutSumup: vi.fn(),
}));

import { consulta } from "@/server/db/client";
import { POST as criarPOST } from "@/app/api/reservas/criar/route";
import { POST as checkoutPOST } from "@/app/api/pagamentos/sumup/checkout/route";
import { POST as webhookPOST } from "@/app/api/webhook/sumup/route";
import { POST as sincronizarPOST } from "@/app/api/pagamentos/sumup/sincronizar/route";
import { GET as statusGET } from "@/app/api/reservas/status/route";
import { criarCheckoutSumup, consultarCheckoutSumup } from "@/server/servicos/sumup";
import { dadosReserva, futuro, prepararBanco, requisicao } from "./ajuda";

const ctx = { params: {} };
let contador = 0;
let dia = 100;

beforeAll(async () => {
  await prepararBanco();
});

beforeEach(async () => {
  await consulta("delete from limites_taxa"); // testes criam muitas reservas do mesmo IP
  vi.mocked(criarCheckoutSumup).mockImplementation(async () => `chk_${++contador}`);
});

async function novaReserva() {
  const res = await criarPOST(
    requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: futuro(dia++), cliente_email: `p${dia}@example.com` }) }),
    ctx
  );
  return (await res.json()) as { codigo: string; preco_total: string };
}

const checkout = async (codigo: string, opcao: string) =>
  (await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao } }), ctx)).json();

const webhook = (id: string) => webhookPOST(requisicao("/api/webhook/sumup", { corpo: { event_type: "checkout.status.changed", id } }), ctx);

const sumupPago = (valorCentavos: number, transacaoId: string) =>
  vi.mocked(consultarCheckoutSumup).mockResolvedValue({ pago: true, valorCentavos, moeda: "EUR", transacaoId });

const estado = async (codigo: string) =>
  (await statusGET(requisicao(`/api/reservas/status?codigo=${codigo}`), ctx)).json();

describe("pagamento: sinal de 20% ou integral", () => {
  it("sinal cobra 20% e a reserva fica 'parcial'; depois cobra so o restante", async () => {
    const { codigo } = await novaReserva(); // 65.00
    const c1 = await checkout(codigo, "sinal");
    expect(c1).toMatchObject({ tipo: "sinal", valor: "13.00" });

    sumupPago(1300, "tx-a1");
    await webhook(c1.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "parcial", pago: "13.00", saldo: "52.00" });

    const c2 = await checkout(codigo, "sinal"); // ja pagou sinal: so resta o saldo
    expect(c2).toMatchObject({ tipo: "restante", valor: "52.00" });
    sumupPago(5200, "tx-a2");
    await webhook(c2.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pago", saldo: "0.00" });

    const [{ n }] = await consulta("select count(*)::int n from pagamentos p join reservas r on r.id = p.reserva_id where r.codigo = $1", [codigo]);
    expect(n).toBe(2);
  });

  it("integral cobra o valor total de uma vez", async () => {
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "integral");
    expect(c).toMatchObject({ tipo: "integral", valor: "65.00" });
    sumupPago(6500, "tx-b1");
    await webhook(c.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pago" });
  });

  it("reserva totalmente paga nao gera novo checkout", async () => {
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "integral");
    sumupPago(6500, "tx-c1");
    await webhook(c.checkout_id);
    const res = await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "integral" } }), ctx);
    expect(res.status).toBe(409);
  });
});

describe("webhook da SumUp", () => {
  it("e idempotente: o mesmo evento repetido nao duplica o pagamento", async () => {
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "sinal");
    sumupPago(1300, "tx-d1");
    await Promise.all([webhook(c.checkout_id), webhook(c.checkout_id), webhook(c.checkout_id)]);
    const [{ n }] = await consulta("select count(*)::int n from pagamentos where sumup_checkout_id = $1", [c.checkout_id]);
    expect(n).toBe(1);
  });

  it("evento forjado (SumUp diz que NAO foi pago) nao marca como pago", async () => {
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "integral");
    vi.mocked(consultarCheckoutSumup).mockResolvedValue({ pago: false, valorCentavos: 6500, moeda: "EUR", transacaoId: null });
    const res = await webhook(c.checkout_id);
    expect(res.status).toBe(200);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pendente", pago: "0.00" });
  });

  it("checkout desconhecido e ignorado (200) e o evento fica registrado", async () => {
    const res = await webhook("chk_inexistente");
    expect(res.status).toBe(200);
    const [{ n }] = await consulta("select count(*)::int n from pagamento_logs");
    expect(n).toBeGreaterThan(0);
  });

  it("registra o valor REALMENTE cobrado e avisa quando diverge do esperado", async () => {
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "integral"); // esperado 65.00
    sumupPago(6000, "tx-e1"); // SumUp cobrou 60.00
    await webhook(c.checkout_id);
    const [p] = await consulta("select valor, observacao from pagamentos where sumup_transaction_id = 'tx-e1'");
    expect(p.valor).toBe("60.00");
    expect(p.observacao).toContain("difere");
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "parcial", saldo: "5.00" });
  });

  it("sincronizar reconcilia checkouts pendentes quando o webhook atrasa", async () => {
    const { codigo } = await novaReserva();
    await checkout(codigo, "integral");
    sumupPago(6500, "tx-f1");
    const res = await sincronizarPOST(requisicao("/api/pagamentos/sumup/sincronizar", { corpo: { codigo } }), ctx);
    expect((await res.json()).registrados).toBe(1);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pago" });
  });

  it("nao cria checkout para reserva cancelada nem para codigo inexistente", async () => {
    const { codigo } = await novaReserva();
    await consulta("update reservas set status = 'cancelado' where codigo = $1", [codigo]);
    expect((await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "integral" } }), ctx)).status).toBe(409);
    expect((await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo: "ZZZZZZZZZZ", opcao: "integral" } }), ctx)).status).toBe(404);
  });
});

describe("pagamento minimo para concluir a reserva (20% ou integral)", () => {
  it("so fica 'concluida' quando o cliente pagou pelo menos o sinal minimo", async () => {
    const { codigo } = await novaReserva(); // 65.00 -> minimo 13.00
    const c = await checkout(codigo, "sinal");
    sumupPago(500, "tx-min-1"); // SumUp cobrou so 5.00 (< 20%)
    await webhook(c.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "parcial", concluida: false, minimo: "13.00" });

    const c2 = await checkout(codigo, "sinal"); // ja pagou algo: cobra o restante
    expect(c2.tipo).toBe("restante");
    sumupPago(6000, "tx-min-2");
    await webhook(c2.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "pago", concluida: true });
  });

  it("sinal de 20% conclui; reserva sem pagamento nao esta concluida", async () => {
    const semPagar = await novaReserva();
    expect(await estado(semPagar.codigo)).toMatchObject({ concluida: false, status_pagamento: "pendente" });
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "sinal");
    sumupPago(1300, "tx-min-3");
    await webhook(c.checkout_id);
    expect(await estado(codigo)).toMatchObject({ status_pagamento: "parcial", concluida: true });
  });

  it("o sinal nunca fica abaixo de 20%, mesmo com centavos quebrados e config invalida", async () => {
    await consulta("update configuracoes set valor = '5' where chave = 'sinal_percentual'");
    const { codigo } = await novaReserva();
    const c = await checkout(codigo, "sinal");
    expect(c.valor).toBe("13.00"); // 5% e ignorado: piso de 20%
    await consulta("update configuracoes set valor = '20' where chave = 'sinal_percentual'");
  });

  it("o valor cobrado e sempre calculado no servidor (o navegador nao consegue baixar)", async () => {
    const { codigo } = await novaReserva();
    const res = await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao: "sinal", valor: 1, amount: 0.01 } }), ctx);
    expect((await res.json()).valor).toBe("13.00");
    expect(vi.mocked(criarCheckoutSumup).mock.calls.at(-1)![0].valorCentavos).toBe(1300);
  });
});

describe("checkout revalida o horario antes de cobrar", () => {
  it("retencao expirada + horario ocupado por outro cliente => recusa (INDISPONIVEL) e nao cobra", async () => {
    const data = futuro(300);
    const a = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: data, cliente_email: "a300@example.com" }) }), ctx);
    const codigoA = (await a.json()).codigo;
    await consulta("update reservas set retido_ate = now() - interval '1 hour' where codigo = $1", [codigoA]);

    const b = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: data, cliente_email: "b300@example.com" }) }), ctx);
    expect(b.status).toBe(201); // o horario tinha sido liberado

    const chamadas = vi.mocked(criarCheckoutSumup).mock.calls.length;
    const res = await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo: codigoA, opcao: "integral" } }), ctx);
    expect(res.status).toBe(409);
    const corpo = await res.json();
    expect(corpo.codigo).toBe("INDISPONIVEL");
    expect(corpo.proximo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(vi.mocked(criarCheckoutSumup).mock.calls.length).toBe(chamadas); // nada foi cobrado
  });

  it("retencao expirada mas horario livre => renova a retencao e segura o veiculo de novo", async () => {
    const data = futuro(310);
    const a = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: data, cliente_email: "a310@example.com" }) }), ctx);
    const codigoA = (await a.json()).codigo;
    await consulta("update reservas set retido_ate = now() - interval '1 hour' where codigo = $1", [codigoA]);
    expect((await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo: codigoA, opcao: "sinal" } }), ctx)).status).toBe(200);

    const b = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: data, cliente_email: "b310@example.com" }) }), ctx);
    expect(b.status).toBe(409); // agora o horario esta seguro para o cliente A
  });

  it("erros para o cliente trazem codigo (e dados) para o front-end traduzir", async () => {
    const r = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ quantidade_passageiros: 9, data_ida: futuro(320) }) }), ctx);
    expect(await r.json()).toMatchObject({ codigo: "CAPACIDADE", max: 4 });
    const p = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: "2020-01-01T10:00:00" }) }), ctx);
    expect((await p.json()).codigo).toBe("DATA_PASSADA");
  });
});
