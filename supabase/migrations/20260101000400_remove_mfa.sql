-- A verificacao em duas etapas (MFA/TOTP) do painel foi removida: o login e so
-- e-mail + senha. As colunas que guardavam o segredo do autenticador saem do banco.
alter table admins
  drop column if exists mfa_secret,
  drop column if exists mfa_ativo,
  drop column if exists mfa_ultimo_passo;
