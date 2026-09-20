import { config } from "@/server/config";
import { comAdmin } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = comAdmin(
  ({ admin }) => ({
    id: admin.id,
    email: admin.email,
    nome: admin.nome,
    mfa_ativo: admin.mfaAtivo,
    mfa_obrigatorio: config.exigirMfa,
    // false => o painel deve levar o admin para a tela de seguranca
    acesso_liberado: !config.exigirMfa || (admin.mfaAtivo && admin.mfaSessao),
  }),
  { permitirSemMfa: true }
);
