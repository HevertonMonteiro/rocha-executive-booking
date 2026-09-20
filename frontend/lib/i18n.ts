import type { Language } from "./translations";

const LOCALES: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

export const localeDe = (lang: Language) => LOCALES[lang] ?? "fr-FR";

/** "2026-10-01T11:45:00" (horario local da viagem, sem fuso) -> "01/10/2026 11:45" no formato do idioma. */
export function dataViagemLocal(iso: string | null | undefined, lang: Language): string {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T").slice(0, 19) + "Z");
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(localeDe(lang), { timeZone: "UTC", dateStyle: "short", timeStyle: "short" });
}

/**
 * Converte o erro da API em mensagem NO IDIOMA do cliente. O servidor devolve um
 * `codigo` estavel (ex.: INDISPONIVEL) e dados (max, proximo); o texto vem das traducoes.
 */
export function mensagemCliente(err: unknown, t: (chave: string) => string, lang: Language): string {
  const dados = (err as { response?: { data?: { codigo?: string; max?: number; proximo?: string | null } } })?.response?.data;
  const codigo = dados?.codigo === "INDISPONIVEL" && !dados.proximo ? "INDISPONIVEL_SEM" : dados?.codigo;
  const chave = codigo ? `err_${codigo}` : "";
  let texto = chave ? t(chave) : "";
  if (!texto || texto === chave) texto = t("errGeneric");
  return texto
    .replace("{max}", String(dados?.max ?? ""))
    .replace("{proximo}", dataViagemLocal(dados?.proximo, lang));
}
