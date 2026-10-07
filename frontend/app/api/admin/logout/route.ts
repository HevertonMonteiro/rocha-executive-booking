import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, lerSessao, opcoesCookie } from "@/server/auth/sessao";
import { consulta } from "@/server/db/client";
import { ErroHttp, json, verificarOrigem } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Outro site nao pode derrubar a sessao do administrador (CSRF de logout).
  try {
    verificarOrigem(req);
  } catch (e) {
    if (e instanceof ErroHttp) return json({ detail: e.message }, e.status);
    throw e;
  }
  // Invalida a sessao NO SERVIDOR: um cookie copiado deixa de valer na hora, nao so
  // quando expirar. Encerra tambem as sessoes do mesmo admin em outros aparelhos.
  try {
    const sessao = await lerSessao(req.cookies.get(COOKIE_SESSAO)?.value);
    if (sessao) {
      await consulta("update admins set sessao_versao = sessao_versao + 1 where id = $1 and sessao_versao = $2", [Number(sessao.sub), sessao.v]);
    }
  } catch (e) {
    console.error("[logout] falha ao invalidar sessao", e instanceof Error ? e.message : e);
  }
  // Sempre limpa o cookie (mesmo sem sessao valida): sair nunca deve falhar.
  const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  resposta.cookies.set(COOKIE_SESSAO, "", { ...opcoesCookie(0), maxAge: 0 });
  return resposta;
}
