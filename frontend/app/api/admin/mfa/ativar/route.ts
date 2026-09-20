import { NextResponse } from "next/server";
import { z } from "zod";
import { validarCodigoMfa } from "@/server/auth/mfa";
import { assinarSessao, COOKIE_SESSAO, opcoesCookie } from "@/server/auth/sessao";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp, lerCorpo, limitar } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = comAdmin(
  async ({ req, admin }) => {
    await limitar(`mfa:${admin.id}`, 8, 900);
    const { codigo } = await lerCorpo(req, z.object({ codigo: z.string().trim().length(6) }));
    const [a] = await consulta<{ mfa_secret: string | null; mfa_ativo: boolean }>(
      "select mfa_secret, mfa_ativo from admins where id = $1",
      [admin.id]
    );
    if (!a?.mfa_secret || a.mfa_ativo) throw new ErroHttp(409, "Inicie a configuracao do MFA primeiro.");
    const r = validarCodigoMfa(a.mfa_secret, codigo, null);
    if (!r.valido) throw new ErroHttp(422, "Codigo invalido. Confira o horario do celular e tente de novo.");

    const [n] = await consulta<{ sessao_versao: number }>(
      "update admins set mfa_ativo = true, mfa_ultimo_passo = $2, sessao_versao = sessao_versao + 1 where id = $1 returning sessao_versao",
      [admin.id, r.passo ?? null]
    );
    const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    resposta.cookies.set(COOKIE_SESSAO, await assinarSessao(admin.id, true, n.sessao_versao), opcoesCookie());
    return resposta;
  },
  { permitirSemMfa: true }
);
