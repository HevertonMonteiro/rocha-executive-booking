import "server-only";
import { consulta, type Executor } from "../db/client";

/** Chaves que podem aparecer no site publico (as demais ficam so no painel). */
export const CHAVES_PUBLICAS = [
  "empresa_nome",
  "whatsapp_numero",
  "whatsapp_exibicao",
  "email_contato",
  "endereco",
  "siret",
  "instagram_url",
  "facebook_url",
  "sinal_percentual",
  // Mentions legales (exigidas na Franca)
  "forme_juridique",
  "capital_social",
  "tva_intracom",
  "directeur_publication",
  "mediateur_consommation",
] as const;

/** Sinal minimo aceito para concluir a reserva (o admin pode aumentar, nunca reduzir). */
export const SINAL_MINIMO = 20;

export const CHAVES_PERMITIDAS = new Set<string>(CHAVES_PUBLICAS);

export async function lerConfiguracoes(somentePublicas = false): Promise<Record<string, string>> {
  const linhas = await consulta<{ chave: string; valor: string }>("select chave, valor from configuracoes");
  const todas = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  if (!somentePublicas) return todas;
  return Object.fromEntries(CHAVES_PUBLICAS.map((c) => [c, todas[c] ?? ""]));
}

/** Usa o executor da transacao em andamento (se houver) para nao abrir uma segunda conexao. */
export async function sinalPercentual(exec?: Executor): Promise<number> {
  const sql = "select valor from configuracoes where chave = 'sinal_percentual'";
  const [linha] = exec ? await exec.query<{ valor: string }>(sql) : await consulta<{ valor: string }>(sql);
  const n = Number(linha?.valor);
  return Number.isFinite(n) && n >= SINAL_MINIMO && n <= 99 ? n : SINAL_MINIMO;
}
