import { NextResponse } from "next/server";
import { z } from "zod";
import { assinarSessao, COOKIE_SESSAO, opcoesCookie } from "@/server/auth/sessao";
import { hashSenha, validarForcaSenha, verificarSenha } from "@/server/auth/senha";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp, lerCorpo, limitar } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = comAdmin(
  async ({ req, admin }) => {
    await limitar(`senha:${admin.id}`, 5, 900);
    const { senha_atual, nova_senha } = await lerCorpo(
      req,
      z.object({ senha_atual: z.string().min(1).max(200), nova_senha: z.string().max(16) })
    );
    const [a] = await consulta<{ senha_hash: string }>("select senha_hash from admins where id = $1", [admin.id]);
    if (!(await verificarSenha(senha_atual, a.senha_hash))) throw new ErroHttp(401, "Senha atual incorreta.");
    const problema = validarForcaSenha(nova_senha);
    if (problema) throw new ErroHttp(422, problema);
    if (nova_senha === senha_atual) throw new ErroHttp(422, "A nova senha deve ser diferente da atual.");

    // Incrementa a versao: invalida todas as outras sessoes abertas (outros aparelhos).
    const [n] = await consulta<{ sessao_versao: number }>(
      "update admins set senha_hash = $2, sessao_versao = sessao_versao + 1 where id = $1 returning sessao_versao",
      [admin.id, await hashSenha(nova_senha)]
    );
    const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    resposta.cookies.set(COOKIE_SESSAO, await assinarSessao(admin.id, admin.mfaSessao, n.sessao_versao), opcoesCookie());
    return resposta;
  },
  { permitirSemMfa: true }
);
