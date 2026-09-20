import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { config, garantirConfig } from "./config";
import { consulta } from "./db/client";
import { requisicaoLocal } from "../lib/acessoLocal";
import { agoraSegundos, assinarSessao, COOKIE_SESSAO, lerSessao, opcoesCookie } from "./auth/sessao";

export class ErroHttp extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo?: string,
    /** Dados para o front-end montar a mensagem traduzida (ex.: { max: 4 }). */
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

export interface AdminAtual {
  id: number;
  email: string;
  nome: string;
  mfaAtivo: boolean;
  mfaSessao: boolean;
  sessaoIni: number;
  sessaoVersao: number;
}

export interface Contexto {
  req: NextRequest;
  params: Record<string, string>;
  ip: string;
  admin: AdminAtual;
}

type Handler = (ctx: Contexto) => Promise<Response | unknown> | Response | unknown;

const SEM_CACHE = { "Cache-Control": "no-store" };

export function json(dados: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(dados, { status, headers: { ...SEM_CACHE, ...headers } });
}

export function ipDe(req: Request): string {
  // Netlify define este cabecalho com o IP real; nao pode ser forjado pelo cliente.
  const netlify = req.headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify;
  const encaminhado = req.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : "desconhecido";
}

// ---------------------------------------------------------------------------
// Limite de requisicoes (persistido no banco: funciona em funcoes serverless)
// ---------------------------------------------------------------------------
export async function excedeuLimite(chave: string, max: number, janelaSeg: number): Promise<boolean> {
  const [linha] = await consulta<{ n: number }>(
    "select count(*)::int as n from limites_taxa where chave = $1 and criado_em > now() - make_interval(secs => $2::int)",
    [chave, janelaSeg]
  );
  return linha.n >= max;
}

export async function registrarTentativa(chave: string): Promise<void> {
  await consulta("insert into limites_taxa (chave) values ($1)", [chave]);
  if (Math.random() < 0.02) await consulta("delete from limites_taxa where criado_em < now() - interval '1 day'");
}

export async function limitar(chave: string, max: number, janelaSeg: number): Promise<void> {
  if (await excedeuLimite(chave, max, janelaSeg)) {
    throw new ErroHttp(429, "Muitas requisicoes. Tente novamente em instantes.", "MUITAS_REQUISICOES");
  }
  await registrarTentativa(chave);
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------
const TAMANHO_MAX_JSON = 200_000;

export async function lerCorpo<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const texto = await req.text();
  if (texto.length > TAMANHO_MAX_JSON) throw new ErroHttp(413, "Corpo da requisicao muito grande.");
  let bruto: unknown;
  try {
    bruto = texto ? JSON.parse(texto) : {};
  } catch {
    throw new ErroHttp(400, "JSON invalido.");
  }
  return schema.parse(bruto);
}

export function lerConsulta<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

export function idDe(ctx: Contexto | { params: Record<string, string> }, nome = "id"): number {
  const n = Number(ctx.params[nome]);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, "Identificador invalido.");
  return n;
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------
function tratarErro(e: unknown): NextResponse {
  if (e instanceof ErroHttp) return json({ detail: e.message, codigo: e.codigo, ...e.extra }, e.status);
  if (e instanceof ZodError) {
    const detail = e.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; ");
    return json({ detail, codigo: "DADOS_INVALIDOS" }, 422);
  }
  const codigo = (e as { code?: string })?.code;
  if (codigo === "23505") return json({ detail: "Ja existe um registro com esses dados.", codigo: "DUPLICADO" }, 409);
  if (codigo === "23503" || codigo === "23001") return json({ detail: "Registro em uso por outros dados; desative em vez de excluir." }, 409);
  if (codigo === "23514" || codigo === "22P02" || codigo === "23502") return json({ detail: "Dados invalidos." }, 422);
  // Nunca devolve detalhes internos ao cliente.
  console.error("[erro]", codigo ?? "", e instanceof Error ? e.message : e);
  return json({ detail: "Erro interno. Tente novamente.", codigo: "ERRO_INTERNO" }, 500);
}

function paraResposta(resultado: unknown): Response {
  if (resultado instanceof Response) return resultado;
  return json(resultado ?? { ok: true });
}

// ---------------------------------------------------------------------------
// Rotas publicas
// ---------------------------------------------------------------------------
export function publica(
  handler: (ctx: Omit<Contexto, "admin">) => Promise<Response | unknown> | Response | unknown,
  opcoes: { limite?: { nome: string; max: number; janelaSeg: number } } = {}
) {
  return async (req: NextRequest, { params }: { params: Record<string, string> } = { params: {} }) => {
    try {
      garantirConfig();
      const ip = ipDe(req);
      if (opcoes.limite) await limitar(`pub:${opcoes.limite.nome}:${ip}`, opcoes.limite.max, opcoes.limite.janelaSeg);
      return paraResposta(await handler({ req, params, ip }));
    } catch (e) {
      return tratarErro(e);
    }
  };
}

// ---------------------------------------------------------------------------
// Rotas do painel admin: sessao + MFA + origem + auditoria
// ---------------------------------------------------------------------------
export function verificarOrigem(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  let origem = req.headers.get("origin");
  if (!origem) {
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        origem = new URL(referer).origin;
      } catch {
        /* ignora */
      }
    }
  }
  const permitidas = new Set([config.siteUrl, req.nextUrl.origin]);
  if (!origem || !permitidas.has(origem.replace(/\/$/, ""))) {
    throw new ErroHttp(403, "Origem da requisicao nao autorizada.");
  }
}

/** No modo "local", o painel e a API do admin simplesmente nao existem para quem vem de fora (404). */
export function exigirAcessoAdmin(req: Request): void {
  if (config.adminAcesso === "local" && !requisicaoLocal(req.headers)) throw new ErroHttp(404, "Nao encontrado.");
}

async function carregarAdmin(req: NextRequest): Promise<AdminAtual> {
  const sessao = await lerSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) throw new ErroHttp(401, "Sessao invalida ou expirada.");
  // Teto absoluto: mesmo usando sem parar, depois de N horas precisa entrar de novo.
  if (agoraSegundos() - sessao.ini > config.sessaoMaximaHoras * 3600) throw new ErroHttp(401, "Sessao expirada.", "SESSAO_EXPIRADA");
  const [a] = await consulta<{
    id: number;
    email: string;
    nome: string;
    ativo: boolean;
    mfa_ativo: boolean;
    sessao_versao: number;
  }>("select id, email, nome, ativo, mfa_ativo, sessao_versao from admins where id = $1", [Number(sessao.sub)]);
  if (!a || !a.ativo || a.sessao_versao !== sessao.v) throw new ErroHttp(401, "Sessao invalida ou expirada.");
  return { id: a.id, email: a.email, nome: a.nome, mfaAtivo: a.mfa_ativo, mfaSessao: sessao.mfa, sessaoIni: sessao.ini, sessaoVersao: a.sessao_versao };
}

export function comAdmin(handler: Handler, opcoes: { permitirSemMfa?: boolean } = {}) {
  return async (req: NextRequest, { params }: { params: Record<string, string> } = { params: {} }) => {
    const ip = ipDe(req);
    let admin: AdminAtual | null = null;
    let resposta: Response;
    try {
      garantirConfig();
      exigirAcessoAdmin(req);
      verificarOrigem(req);
      admin = await carregarAdmin(req);
      if (!opcoes.permitirSemMfa && config.exigirMfa && !(admin.mfaAtivo && admin.mfaSessao)) {
        throw new ErroHttp(403, "Ative a autenticacao em dois fatores para continuar.", "MFA_OBRIGATORIO");
      }
      resposta = paraResposta(await handler({ req, params, ip, admin }));
      // Sessao deslizante: cada uso reinicia os 30 minutos de inatividade (sem passar do teto absoluto).
      const comCookie = resposta instanceof NextResponse ? resposta : new NextResponse(resposta.body, resposta);
      if (!comCookie.cookies.has(COOKIE_SESSAO)) {
        comCookie.cookies.set(COOKIE_SESSAO, await assinarSessao(admin.id, admin.mfaSessao, admin.sessaoVersao, admin.sessaoIni), opcoesCookie());
      }
      resposta = comCookie;
    } catch (e) {
      resposta = tratarErro(e);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      // Auditoria: quem, o que, de onde. Sem corpo da requisicao (evita dados sensiveis).
      await consulta("insert into auditoria_admin (admin_id, acao, status_http, ip) values ($1, $2, $3, $4)", [
        admin?.id ?? null,
        `${req.method} ${req.nextUrl.pathname}`.slice(0, 200),
        resposta.status,
        ip,
      ]).catch((e) => console.error("[auditoria] falha ao registrar", e?.message));
    }
    return resposta;
  };
}
