import { NextResponse } from "next/server";
import { z } from "zod";
import { validarCodigoMfa } from "@/server/auth/mfa";
import { assinarSessao, COOKIE_SESSAO, opcoesCookie } from "@/server/auth/sessao";
import { verificarSenha } from "@/server/auth/senha";
import { config } from "@/server/config";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp, lerCorpo, limitar } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = comAdmin(async ({ req, admin }) => {
  if (config.exigirMfa) throw new ErroHttp(403, "O MFA e obrigatorio neste ambiente e nao pode ser desativado.");
  await limitar(`mfa:${admin.id}`, 8, 900);
  const { senha, codigo } = await lerCorpo(req, z.object({ senha: z.string().max(200), codigo: z.string().trim().length(6) }));
  const [a] = await consulta<{ senha_hash: string; mfa_secret: string | null; mfa_ultimo_passo: string | null }>(
    "select senha_hash, mfa_secret, mfa_ultimo_passo from admins where id = $1",
    [admin.id]
  );
  const codigoOk = a.mfa_secret ? validarCodigoMfa(a.mfa_secret, codigo, a.mfa_ultimo_passo ? Number(a.mfa_ultimo_passo) : null).valido : false;
  if (!(await verificarSenha(senha, a.senha_hash)) || !codigoOk) throw new ErroHttp(401, "Senha ou codigo incorretos.");
  const [n] = await consulta<{ sessao_versao: number }>(
    "update admins set mfa_ativo = false, mfa_secret = null, mfa_ultimo_passo = null, sessao_versao = sessao_versao + 1 where id = $1 returning sessao_versao",
    [admin.id]
  );
  const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  resposta.cookies.set(COOKIE_SESSAO, await assinarSessao(admin.id, false, n.sessao_versao), opcoesCookie());
  return resposta;
}, { permitirSemMfa: true });
