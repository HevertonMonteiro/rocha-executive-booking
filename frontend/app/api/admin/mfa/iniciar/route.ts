import { cifrarSegredo, novoSegredoMfa, qrCodeMfa } from "@/server/auth/mfa";
import { consulta } from "@/server/db/client";
import { comAdmin, ErroHttp } from "@/server/http";

export const dynamic = "force-dynamic";

// Gera um novo segredo TOTP (fica inativo ate o admin confirmar com um codigo valido).
export const POST = comAdmin(
  async ({ admin }) => {
    if (admin.mfaAtivo) throw new ErroHttp(409, "A autenticacao em dois fatores ja esta ativa.");
    const segredo = novoSegredoMfa();
    await consulta("update admins set mfa_secret = $2, mfa_ativo = false, mfa_ultimo_passo = null where id = $1", [
      admin.id,
      cifrarSegredo(segredo),
    ]);
    const { qr } = await qrCodeMfa(admin.email, segredo);
    return { qr, segredo };
  },
  { permitirSemMfa: true }
);
