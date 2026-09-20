import "server-only";

function inteiro(nome: string, padrao: number): number {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && v > 0 ? v : padrao;
}

export const producao = () => process.env.NODE_ENV === "production";

export const config = {
  get siteUrl() {
    return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || "";
  },
  get chaveCifra() {
    return process.env.APP_ENCRYPTION_KEY || "";
  },
  get exigirMfa() {
    const v = process.env.ADMIN_REQUIRE_MFA;
    return v ? v === "true" : producao();
  },
  get sumup() {
    return {
      apiUrl: process.env.SUMUP_API_URL || "https://api.sumup.com/v0.1",
      apiKey: process.env.SUMUP_API_KEY || "",
      merchantCode: process.env.SUMUP_MERCHANT_CODE || "",
      payToEmail: process.env.SUMUP_PAY_TO_EMAIL || "",
    };
  },
  get supabase() {
    return {
      url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      bucket: process.env.SUPABASE_STORAGE_BUCKET || "site-media",
    };
  },
  get driverStorage(): "supabase" | "local" {
    return (process.env.STORAGE_DRIVER || (producao() ? "supabase" : "local")) as "supabase" | "local";
  },
  get uploadMaxBytes() {
    return inteiro("UPLOAD_MAX_MB", 5) * 1024 * 1024;
  },
  get holdPendenteMinutos() {
    return inteiro("HOLD_PENDENTE_MINUTOS", 30);
  },
  get margemRetornoMinutos() {
    return inteiro("MARGEM_RETORNO_MINUTOS", 15);
  },
  get loginMaxTentativas() {
    return inteiro("LOGIN_MAX_TENTATIVAS", 5);
  },
  get loginJanelaMinutos() {
    return inteiro("LOGIN_JANELA_MINUTOS", 15);
  },
  /** Desconecta o admin apos este tempo SEM atividade (renovado a cada requisicao). */
  get sessaoInatividadeMinutos() {
    return inteiro("SESSAO_INATIVIDADE_MINUTOS", 30);
  },
  /** Teto absoluto: mesmo com atividade continua, o admin precisa entrar de novo depois disso. */
  get sessaoMaximaHoras() {
    return inteiro("SESSAO_MAXIMA_HORAS", 8);
  },
  /**
   * "local": o painel so responde a acessos diretos do proprio computador (padrao em
   * desenvolvimento). Quem entra por um link publico/tunel recebe 404 no painel.
   * "qualquer": acessivel pelo dominio publico (padrao em production).
   */
  get adminAcesso(): "local" | "qualquer" {
    const v = process.env.ADMIN_ACESSO;
    if (v === "local" || v === "qualquer") return v;
    return producao() ? "qualquer" : "local";
  },
  /** Pagamento de TESTE sem SumUp. Nunca funciona em production. */
  get pagamentoSimulado() {
    return process.env.PAGAMENTO_SIMULADO === "true" && !producao();
  },
};

let validado = false;

/** Em production recusa iniciar com configuracao insegura (fail-fast, na 1a requisicao). */
export function garantirConfig(): void {
  if (validado || !producao()) return;
  const problemas: string[] = [];
  if (config.jwtSecret.length < 32) problemas.push("JWT_SECRET precisa de 32+ caracteres aleatorios.");
  if (!config.chaveCifra) problemas.push("APP_ENCRYPTION_KEY nao configurada (32 bytes em base64).");
  if (!config.siteUrl.startsWith("https://")) problemas.push("SITE_URL deve usar https://.");
  const url = process.env.DATABASE_URL || "";
  if (!url || url.startsWith("pglite:")) problemas.push("DATABASE_URL deve apontar para o PostgreSQL da Supabase.");
  if (process.env.PAGAMENTO_SIMULADO === "true") problemas.push("PAGAMENTO_SIMULADO nao pode estar ligado em production.");
  if (config.driverStorage === "supabase" && (!config.supabase.url || !config.supabase.serviceRoleKey))
    problemas.push("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao necessarias para o storage.");
  if (problemas.length) {
    console.error("[config] Configuracao insegura:\n - " + problemas.join("\n - "));
    throw new Error("Servidor mal configurado.");
  }
  validado = true;
}
