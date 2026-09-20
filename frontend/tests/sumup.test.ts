import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarCheckoutSumup } from "@/server/servicos/sumup";
import { ErroHttp } from "@/server/http";

let chamadas: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  chamadas = [];
  process.env.SUMUP_API_KEY = "sk_teste_secreta";
  process.env.SUMUP_MERCHANT_CODE = "MERCHANT1";
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    chamadas.push({ url, init });
    return new Response(JSON.stringify({ id: "chk_abc" }), { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("criacao do checkout na SumUp (somente no servidor)", () => {
  it("faz POST /v0.1/checkouts com a chave secreta, valor em EUR e URLs de retorno (https)", async () => {
    process.env.SITE_URL = "https://rocha-transfer.fr";
    const id = await criarCheckoutSumup({ referencia: "ROCHA-X", valorCentavos: 1300, descricao: "Reserva X", redirectUrl: "https://rocha-transfer.fr/reserva/sucesso?codigo=X" });
    expect(id).toBe("chk_abc");
    const { url, init } = chamadas[0];
    expect(url).toBe("https://api.sumup.com/v0.1/checkouts");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_teste_secreta");
    expect(JSON.parse(init.body as string)).toMatchObject({
      checkout_reference: "ROCHA-X",
      amount: 13,
      currency: "EUR",
      merchant_code: "MERCHANT1",
      return_url: "https://rocha-transfer.fr/api/webhook/sumup",
      redirect_url: "https://rocha-transfer.fr/reserva/sucesso?codigo=X",
    });
    process.env.SITE_URL = "http://localhost:3000";
  });

  it("em localhost nao envia return_url (a SumUp nao alcanca endereco local)", async () => {
    process.env.SITE_URL = "http://localhost:3000";
    await criarCheckoutSumup({ referencia: "R", valorCentavos: 6500, descricao: "d" });
    expect(JSON.parse(chamadas[0].init.body as string)).not.toHaveProperty("return_url");
  });

  it("sem chave da SumUp devolve erro traduzivel PAGAMENTO_INDISPONIVEL", async () => {
    process.env.SUMUP_API_KEY = "";
    const erro = await criarCheckoutSumup({ referencia: "R", valorCentavos: 100, descricao: "d" }).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroHttp);
    expect(erro).toMatchObject({ status: 503, codigo: "PAGAMENTO_INDISPONIVEL" });
  });
});
