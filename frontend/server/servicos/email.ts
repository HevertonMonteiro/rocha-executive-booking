import "server-only";
import { config } from "../config";

export interface Email {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  responderPara?: string | null;
}

/** Escapa texto digitado pelo cliente antes de entrar no HTML do e-mail. */
export function esc(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const emailConfigurado = () => Boolean(config.email.apiKey && config.email.remetente);

/**
 * Envia pela API do Resend. NUNCA lanca erro: e-mail e aviso, nao pode derrubar
 * a confirmacao de um pagamento. Devolve se o envio foi aceito.
 */
export async function enviarEmail(e: Email): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.email.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.email.remetente,
        to: [e.para],
        subject: e.assunto,
        html: e.html,
        text: e.texto,
        ...(e.responderPara ? { reply_to: e.responderPara } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!resposta.ok) console.error("[email] resposta", resposta.status);
    return resposta.ok;
  } catch (err) {
    console.error("[email] falha ao enviar", err instanceof Error ? err.message : err);
    return false;
  }
}
