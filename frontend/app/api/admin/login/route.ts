import { NextResponse } from "next/server";
import { z } from "zod";
import { assinarSessao, COOKIE_SESSAO, opcoesCookie } from "@/server/auth/sessao";
import { validarCodigoMfa } from "@/server/auth/mfa";
import { verificarSenha } from "@/server/auth/senha";
import { config, garantirConfig } from "@/server/config";
import { consulta } from "@/server/db/client";
import { ErroHttp, excedeuLimite, exigirAcessoAdmin, ipDe, json, lerCorpo, registrarTentativa, verificarOrigem } from "@/server/http";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(100),
  senha: z.string().min(1).max(200),
  codigo: z.string().trim().max(10).optional(),
});

const ERRO_GENERICO = "E-mail ou senha invalidos.";

export async function POST(req: NextRequest) {
  try {
    garantirConfig();
    exigirAcessoAdmin(req);
    verificarOrigem(req);
    const { email, senha, codigo } = await lerCorpo(req, schema);
    const ip = ipDe(req);
    const janela = config.loginJanelaMinutos * 60;
    const chaveIp = `login:ip:${ip}`;
    const chaveConta = `login:conta:${email}`;

    // Bloqueio contra forca bruta por IP e por conta (persistido no banco).
    if ((await excedeuLimite(chaveIp, config.loginMaxTentativas * 4, janela)) || (await excedeuLimite(chaveConta, config.loginMaxTentativas, janela))) {
      throw new ErroHttp(429, `Muitas tentativas. Aguarde ${config.loginJanelaMinutos} minutos e tente novamente.`);
    }

    const [admin] = await consulta<{
      id: number;
      senha_hash: string;
      ativo: boolean;
      mfa_ativo: boolean;
      mfa_secret: string | null;
      mfa_ultimo_passo: string | null;
      sessao_versao: number;
    }>("select id, senha_hash, ativo, mfa_ativo, mfa_secret, mfa_ultimo_passo, sessao_versao from admins where email = $1", [email]);

    // Sempre executa a verificacao (mesmo sem admin) para nao vazar existencia da conta pelo tempo.
    const senhaOk = await verificarSenha(senha, admin?.senha_hash ?? null);
    const falhar = async (mensagem: string) => {
      await registrarTentativa(chaveIp);
      await registrarTentativa(chaveConta);
      await consulta("insert into auditoria_admin (admin_id, acao, status_http, ip) values ($1, 'LOGIN falhou', 401, $2)", [
        admin?.id ?? null,
        ip,
      ]);
      throw new ErroHttp(401, mensagem);
    };
    if (!admin || !admin.ativo || !senhaOk) return await falhar(ERRO_GENERICO);

    if (admin.mfa_ativo && admin.mfa_secret) {
      if (!codigo) return json({ mfa_necessario: true });
      const r = validarCodigoMfa(admin.mfa_secret, codigo, admin.mfa_ultimo_passo ? Number(admin.mfa_ultimo_passo) : null);
      if (!r.valido) return await falhar("Codigo de verificacao invalido.");
      if (r.passo !== undefined) await consulta("update admins set mfa_ultimo_passo = $2 where id = $1", [admin.id, r.passo]);
    }

    await consulta("insert into auditoria_admin (admin_id, acao, status_http, ip) values ($1, 'LOGIN ok', 200, $2)", [admin.id, ip]);
    const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    resposta.cookies.set(COOKIE_SESSAO, await assinarSessao(admin.id, admin.mfa_ativo, admin.sessao_versao), opcoesCookie());
    return resposta;
  } catch (e) {
    if (e instanceof ErroHttp) return json({ detail: e.message }, e.status);
    if (e && typeof e === "object" && "issues" in e) return json({ detail: ERRO_GENERICO }, 401);
    console.error("[login]", e instanceof Error ? e.message : e);
    return json({ detail: "Erro interno. Tente novamente." }, 500);
  }
}
