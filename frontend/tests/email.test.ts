import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { consulta } from "@/server/db/client";
import { POST as criarPOST } from "@/app/api/reservas/criar/route";
import { POST as checkoutPOST } from "@/app/api/pagamentos/sumup/checkout/route";
import { POST as simuladoPOST } from "@/app/api/pagamentos/simulado/pagar/route";
import { POST as orcamentoPOST } from "@/app/api/orcamentos/route";
import { dadosReserva, futuro, prepararBanco, requisicao } from "./ajuda";

const ctx = { params: Promise.resolve({}) };
let envio: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  await prepararBanco();
  process.env.PAGAMENTO_SIMULADO = "true";
  await consulta("update configuracoes set valor = 'contato@rocha.fr' where chave = 'email_contato'");
});

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_teste";
  process.env.EMAIL_REMETENTE = "Rocha <reservas@rocha.fr>";
  envio = vi.fn(async () => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
  vi.stubGlobal("fetch", envio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_REMETENTE;
});

const emails = () =>
  envio.mock.calls
    .filter(([url]) => String(url).startsWith("https://api.resend.com/"))
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

/** Cria uma reserva e paga (modo simulado) o sinal ou o total. */
async function reservarEPagar(dias: number, opcao: "sinal" | "integral", extra: Record<string, unknown> = {}) {
  const corpo = dadosReserva({ data_ida: futuro(dias), cliente_email: `email${dias}@example.com`, ...extra });
  const { codigo } = await (await criarPOST(requisicao("/api/reservas/criar", { corpo }), ctx)).json();
  const c = await (await checkoutPOST(requisicao("/api/pagamentos/sumup/checkout", { corpo: { codigo, opcao } }), ctx)).json();
  const r = await (await simuladoPOST(requisicao("/api/pagamentos/simulado/pagar", { corpo: { checkout_id: c.checkout_id } }), ctx)).json();
  return { codigo: codigo as string, resultado: r.resultado as string };
}

describe("e-mail de confirmacao do pagamento", () => {
  it("envia ao cliente no idioma dele e avisa a empresa", async () => {
    const { codigo } = await reservarEPagar(600, "integral", { idioma: "de" });
    const [cliente, empresa] = emails();
    expect(cliente.to).toEqual(["email600@example.com"]);
    expect(cliente.subject).toBe(`Buchung bestätigt — ${codigo}`);
    expect(cliente.reply_to).toBe("contato@rocha.fr");
    expect(cliente.text).toContain("Buchung vollständig bezahlt.");
    expect(cliente.html).not.toContain("/reserva/pagar");
    expect(empresa.to).toEqual(["contato@rocha.fr"]);
    expect(empresa.subject).toContain(codigo);
  });

  it("com sinal pago mostra o saldo e o link para pagar o restante", async () => {
    const { codigo } = await reservarEPagar(610, "sinal", { idioma: "fr" });
    const [cliente] = emails();
    expect(cliente.subject).toBe(`Réservation confirmée — ${codigo}`);
    expect(cliente.text).toContain("Reste à payer");
    expect(cliente.html).toContain(`/reserva/pagar?codigo=${codigo}`);
  });

  it("escapa o nome digitado pelo cliente no HTML", async () => {
    await reservarEPagar(620, "integral", { cliente_nome: "<img src=x onerror=alert(1)>" });
    const [cliente] = emails();
    expect(cliente.html).not.toContain("<img src=x");
    expect(cliente.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("falha no provedor de e-mail nao impede registrar o pagamento", async () => {
    envio.mockImplementation(async () => {
      throw new Error("rede fora do ar");
    });
    const { codigo, resultado } = await reservarEPagar(630, "integral");
    expect(resultado).toBe("registrado");
    const [r] = await consulta("select status_pagamento from reservas where codigo = $1", [codigo]);
    expect(r.status_pagamento).toBe("pago");
  });

  it("sem chave do Resend nenhum e-mail e enviado", async () => {
    delete process.env.RESEND_API_KEY;
    const { resultado } = await reservarEPagar(640, "integral");
    expect(resultado).toBe("registrado");
    expect(emails()).toHaveLength(0);
  });
});

describe("e-mail de novo pedido de orcamento", () => {
  it("avisa a empresa com os dados do pedido e responde direto ao cliente", async () => {
    const corpo = {
      origem_texto: "Giverny",
      destino_texto: "Paris (Centre)",
      data_ida: futuro(20),
      quantidade_passageiros: 2,
      cliente_nome: "Ana Orcamento",
      cliente_telefone: "+33622222222",
      cliente_email: "ana@example.com",
    };
    const res = await orcamentoPOST(requisicao("/api/orcamentos", { corpo, headers: { "x-forwarded-for": "203.0.113.50" } }), ctx);
    expect(res.status).toBe(201);
    const [aviso] = emails();
    expect(aviso.to).toEqual(["contato@rocha.fr"]);
    expect(aviso.subject).toBe("Novo pedido de orçamento — Giverny → Paris (Centre)");
    expect(aviso.reply_to).toBe("ana@example.com");
    expect(aviso.text).toContain("+33622222222");
  });
});
