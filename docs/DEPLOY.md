# Publicação: Netlify + Supabase

> **Este repositório apenas prepara a estrutura.** Nada foi criado, enviado ou publicado
> na Netlify nem na Supabase. Os passos abaixo são para quando a empresa decidir subir o site.

## Arquitetura

```
Cliente (navegador)
   │  HTTPS
   ▼
Netlify  ── Next.js 14 (páginas + API em funções serverless, TypeScript)
   │            │  cookie HttpOnly (sessão do admin)      ┌─ SumUp (pagamento; webhook → /api/webhook/sumup)
   │            └──────────────────────────────────────────┘
   │  conexão direta TLS, papel `app_server` (sem acesso público)
   ▼
Supabase ── PostgreSQL (RLS em todas as tabelas) + Storage (fotos, bucket público só-leitura)
```

* **Não existe servidor Python em produção.** A pasta `backend/` (FastAPI) é o protótipo
  antigo e **não é usada** — a Netlify não executa Python. Toda a regra de negócio está em
  `frontend/server/`.
* O navegador **nunca** fala com a Supabase: nenhuma chave da Supabase vai para o front-end.

## 1. Supabase

1. Crie o projeto numa **região da UE** (Paris `eu-west-3` ou Frankfurt `eu-central-1`) — os
   dados dos clientes ficam na Europa (RGPD).
2. Aplique o esquema (`supabase/migrations/*.sql`) de **um** dos jeitos:
   * CLI: `supabase login && supabase link --project-ref <ref> && supabase db push`
   * ou no *SQL Editor*, colando os arquivos **em ordem** (`…_schema.sql`, depois `…_storage.sql`).
3. (Opcional, uma única vez) carregue o conteúdo inicial: cole `supabase/seed.sql` no SQL Editor.
4. **Defina a senha do papel da aplicação** (a migração cria `app_server` sem login):
   ```sql
   alter role app_server with login password '<SENHA-LONGA-ALEATORIA>';  -- openssl rand -base64 32
   ```
   Guarde a senha só no gerenciador de segredos/Netlify. Não use o usuário `postgres` no app.
5. Copie a string de conexão do **Pooler → modo transação (porta 6543)** e troque o usuário por
   `app_server.<ref-do-projeto>`:
   `postgresql://app_server.<ref>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:6543/postgres`
6. **Endureça a Supabase** (Project Settings):
   * *API → Data API*: **desative** (o app não usa PostgREST) ou remova `public` dos schemas expostos.
   * *Database → SSL*: ative *Enforce SSL*.
   * *Database → Backups*: confirme backups diários; para RPO menor, ative PITR (plano pago).
   * Ative **MFA na sua conta Supabase** e use uma organização só com quem precisa.
7. Storage: o bucket `site-media` (público, só leitura, 5 MB, JPG/PNG/WebP) é criado pela migração.
   Copie a `service_role key` (Settings → API) — **secreta**, só no servidor.

## 2. Netlify

1. *Add new site → Import from Git*. O `netlify.toml` da raiz já define `base = frontend`.
2. Em *Site configuration → Environment variables*, cadastre (marque **Contains secret values** nos segredos):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string do pooler com `app_server` (item 1.5) |
   | `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | `https://seu-dominio.fr` |
   | `JWT_SECRET` | `openssl rand -base64 48` |
   | `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` (cifra o segredo do MFA) |
   | `ADMIN_REQUIRE_MFA` | `true` |
   | `SESSAO_INATIVIDADE_MINUTOS` / `SESSAO_MAXIMA_HORAS` | `30` / `8` (padrões) |
   | `PAGAMENTO_SIMULADO` | **não definir** (o servidor recusa iniciar se estiver `true`) |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave de serviço |
   | `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_PAY_TO_EMAIL` | painel de desenvolvedores da SumUp |

   Todas as opções estão em `frontend/.env.example`. Com `NODE_ENV=production` o servidor **recusa
   iniciar** se `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `DATABASE_URL` (Postgres) ou `SITE_URL` (https) forem inseguros.
3. *Functions → Region*: escolha a mesma região da UE do banco (menor latência e dados na Europa).
4. Domínio próprio + HTTPS automático (Let's Encrypt). Ative *Force HTTPS*.
5. A função agendada `netlify/functions/manutencao.mts` roda todo dia (limpa contadores e logs antigos).

## 3. SumUp

* Não há webhook a cadastrar no painel: o servidor cria cada cobrança (`POST /v0.1/checkouts`, com a chave secreta,
  **nunca no navegador**) já informando `return_url = https://seu-dominio.fr/api/webhook/sumup`, e a SumUp avisa por ali
  (isso só acontece com `SITE_URL` em `https://`).
* O sistema **não confia** no conteúdo do webhook: confirma o pagamento consultando a API da SumUp e registra o valor realmente cobrado.
* O valor cobrado é sempre calculado no servidor: **no mínimo `sinal_percentual` (20% ou mais)** do total, ou o total. A reserva só é
  considerada concluída depois disso (`/api/reservas/status` → `concluida`).
* Teste tudo no *sandbox* antes de usar a chave real. Se o formulário de cartão não abrir em algum
  ambiente, veja o console do navegador: pode ser necessário liberar um domínio no CSP (`frontend/next.config.mjs`).

## 4. Primeiro administrador

Com as variáveis de produção no terminal (em uma máquina de confiança):

```bash
cd frontend
DATABASE_URL='<string de produção>' npm run admin:criar -- dono@suaempresa.fr
# a senha é pedida sem aparecer na tela (mín. 12 caracteres)
```

Depois: entre em `/admin/login` → o painel exigirá configurar o **aplicativo autenticador (MFA)**.
Esse mesmo comando redefine a senha e derruba todas as sessões (recuperação de acesso).

## 5. Checklist antes de divulgar

- [ ] Testes: `npm test` e `npm run typecheck` sem erros; `npm run build` ok.
- [ ] MFA ativo no admin; senha forte; nenhum admin de teste.
- [ ] Pagamento real de teste com valor baixo (sinal e integral) e webhook registrando sozinho.
- [ ] Preencher em **Admin → Dados da empresa**: SIRET, endereço, e-mail, forma jurídica, diretor de publicação e mediador de consumo (alimentam as *mentions légales* e as CGV).
- [ ] Revisão jurídica das CGV (`/conditions-generales`), da Política de Confidentialité e das Mentions légales (textos em `frontend/lib/legal.ts`, francês + 5 traduções). Confirmar a política de cancelamento tardio.
- [ ] O sistema **ainda não envia e-mails** (voucher/confirmação): a comunicação é por WhatsApp/telefone. Planejar um provedor de e-mail transacional (UE).
- [ ] Domínio com HTTPS e cabeçalhos (confira em securityheaders.com).
- [ ] Backups da Supabase confirmados e um teste de restauração feito.
- [ ] Planejar a atualização do Next.js (ver `docs/SEGURANCA.md`, "Riscos conhecidos").

## Compartilhar o ambiente local para outra pessoa testar

Com o servidor de desenvolvimento rodando (`npm run dev`), abra um túnel temporário, por exemplo:

```bash
ngrok http 3000          # ou: cloudflared tunnel --url http://localhost:3000
```

* A URL `https://…ngrok-free.dev` mostra o site e o fluxo de reserva. Quando você parar o servidor ou o túnel, o link para de funcionar.
* **O painel `/admin` e a API `/api/admin/*` NÃO existem pelo link público** (404, mesmo com o administrador logado): em desenvolvimento
  o painel só responde a acessos diretos do próprio computador (`ADMIN_ACESSO=local`). A sessão do admin fica em um cookie do *seu* navegador
  (`HttpOnly`, `SameSite=Strict`), que nunca é compartilhado com quem usa o link.
* Sem chave da SumUp, use `PAGAMENTO_SIMULADO=true` (já vem no `.env.local` de desenvolvimento): o checkout mostra um painel **MODE TEST**
  para aprovar/recusar o pagamento sem cobrar nada. Tudo que o testador criar fica no banco local; apague com `rm -rf frontend/.data` e refaça `db:migrar`/`db:seed`.
* O site enviado por túnel leva `X-Robots-Tag: noindex` (não vai para o Google).

## Desenvolvimento local (sem Docker e sem conta em nenhuma nuvem)

```bash
cd frontend
npm install
npm run setup                            # cria .env.local com segredos aleatórios (obrigatório)
npm run db:migrar && npm run db:seed     # banco local em arquivo (PGlite), pasta .data/
npm run admin:criar -- admin@rocha.local # cria o admin local
npm run dev                              # http://localhost:3000  (painel em /admin)
npm test                                 # 62 testes (Postgres real em memória)
```
Pare o `npm run dev` antes de rodar `db:*` ou `admin:criar` (o banco local é um arquivo com um único acesso por vez).
