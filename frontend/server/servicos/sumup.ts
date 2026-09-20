import "server-only";
import { randomBytes } from "node:crypto";
import { config } from "../config";
import { deCentavos, paraCentavos } from "../dinheiro";
import { ErroHttp } from "../http";

async function chamar(caminho: string, init: RequestInit = {}): Promise<any> {
  const { apiUrl, apiKey } = config.sumup;
  if (!apiKey) throw new ErroHttp(503, "Pagamento indisponivel no momento.", "PAGAMENTO_INDISPONIVEL");
  const resposta = await fetch(`${apiUrl}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!resposta.ok) {
    console.error("[sumup] resposta", resposta.status, caminho);
    throw new ErroHttp(502, "Nao foi possivel processar o pagamento. Tente novamente.", "PAGAMENTO_FALHOU");
  }
  return resposta.json();
}

/**
 * Cria o checkout NO SERVIDOR (POST /v0.1/checkouts, autenticado com a chave
 * secreta da SumUp) e devolve so o id usado pelo Card Widget. O valor sempre
 * vem do servidor: o navegador nunca escolhe quanto cobrar nem ve a chave.
 */
export async function criarCheckoutSumup(params: {
  referencia: string;
  valorCentavos: number;
  descricao: string;
  /** Pagina para onde a SumUp devolve o cliente apos pagamentos com redirecionamento (3DS/APM). */
  redirectUrl?: string;
}): Promise<string> {
  // Modo de TESTE (so desenvolvimento): nao chama a SumUp e nao cobra nada.
  if (config.pagamentoSimulado) return `sim_${randomBytes(8).toString("hex")}`;
  const { merchantCode, payToEmail } = config.sumup;
  // A SumUp avisa o resultado do pagamento na URL informada em `return_url`
  // (nao ha cadastro de webhook no painel). So funciona com URL publica https.
  const publico = config.siteUrl.startsWith("https://");
  const dados = await chamar("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: params.referencia,
      amount: Number(deCentavos(params.valorCentavos)),
      currency: "EUR",
      merchant_code: merchantCode,
      ...(payToEmail ? { pay_to_email: payToEmail } : {}),
      description: params.descricao,
      ...(publico ? { return_url: `${config.siteUrl}/api/webhook/sumup` } : {}),
      ...(publico && params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
    }),
  });
  if (!dados?.id) throw new ErroHttp(502, "Nao foi possivel processar o pagamento.", "PAGAMENTO_FALHOU");
  return String(dados.id);
}

export interface CheckoutVerificado {
  pago: boolean;
  valorCentavos: number;
  moeda: string;
  transacaoId: string | null;
}

/**
 * Confirma o pagamento consultando a SumUp diretamente. NUNCA confiamos no que
 * chega no webhook: qualquer pessoa poderia forjar um evento "pago".
 */
export async function consultarCheckoutSumup(checkoutId: string): Promise<CheckoutVerificado | null> {
  try {
    const dados = await chamar(`/checkouts/${encodeURIComponent(checkoutId)}`);
    const transacoes: Array<{ id?: string; status?: string }> = dados.transactions ?? [];
    const ok = transacoes.find((t) => t.status === "SUCCESSFUL") ?? transacoes[0];
    return {
      pago: dados.status === "PAID",
      valorCentavos: paraCentavos(dados.amount),
      moeda: String(dados.currency ?? "EUR"),
      transacaoId: ok?.id ? String(ok.id) : null,
    };
  } catch {
    return null;
  }
}
