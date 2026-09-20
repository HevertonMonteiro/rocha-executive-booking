declare global {
  interface Window {
    SumUpCard?: {
      mount: (config: {
        id: string;
        checkoutId: string;
        locale?: string;
        theme?: string;
        onResponse?: (type: string, body?: unknown) => void;
      }) => void;
    };
  }
}

const SUMUP_SDK_URL = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";

const LOCALES: Record<string, string> = {
  pt: "pt-BR",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  en: "en-US",
};

/** Painel de TESTE (checkout "sim_..."): permite concluir o fluxo sem cartao e sem cobrar nada. */
function montarSimulado(alvoId: string, checkoutId: string, onResultado: (tipo: string) => void) {
  const alvo = document.getElementById(alvoId);
  if (!alvo) return;
  alvo.innerHTML = "";
  const caixa = document.createElement("div");
  caixa.style.cssText = "width:100%;text-align:center;color:#e2e8f0;font-family:inherit";
  caixa.innerHTML =
    '<div style="display:inline-block;background:#f59e0b;color:#111827;font-weight:800;font-size:11px;letter-spacing:.08em;padding:4px 10px;border-radius:999px;margin-bottom:12px">MODE TEST · TEST MODE</div>' +
    '<p style="font-size:13px;margin:0 0 16px">Aucun montant réel n\'est débité. / No real charge is made.</p>';
  const botao = (texto: string, estilo: string, aoClicar: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.style.cssText = `display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:10px;font-weight:700;cursor:pointer;${estilo}`;
    b.onclick = aoClicar;
    caixa.appendChild(b);
  };
  botao("Simuler un paiement accepté · Simulate approved payment", "background:#22c55e;color:#052e16", async () => {
    try {
      const r = await fetch("/api/pagamentos/simulado/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkout_id: checkoutId }),
      });
      onResultado(r.ok ? "success" : "error");
    } catch {
      onResultado("error");
    }
  });
  botao("Simuler un refus · Simulate declined", "background:#334155;color:#e2e8f0", () => onResultado("error"));
  alvo.appendChild(caixa);
}

/** Carrega o SDK da SumUp (uma vez) e monta o formulario de cartao no elemento indicado. */
export async function montarSumup(opcoes: {
  alvoId: string;
  checkoutId: string;
  idioma: string;
  onResultado: (tipo: string) => void;
}): Promise<void> {
  if (opcoes.checkoutId.startsWith("sim_")) return montarSimulado(opcoes.alvoId, opcoes.checkoutId, opcoes.onResultado);
  if (!window.SumUpCard) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SUMUP_SDK_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar o SDK da SumUp"));
      document.body.appendChild(script);
    });
  }
  window.SumUpCard!.mount({
    id: opcoes.alvoId,
    checkoutId: opcoes.checkoutId,
    locale: LOCALES[opcoes.idioma] ?? "en-US",
    theme: "dark",
    onResponse: (tipo) => opcoes.onResultado(tipo),
  });
}
