# Rocha Executive Transport — reservas de transfer executivo (França)

Site de captação e reservas + painel administrativo.

* **Site público** (Next.js 16): busca, escolha de veículo com disponibilidade em tempo real,
  pagamento de **sinal (padrão 20%) ou integral** via SumUp, FAQ, página de parceiros, SEO para a França.
* **Painel `/admin`**: reservas (recebe → destina parceiro → confirma → finaliza), pagamentos e
  status, clientes, parceiros (solicitações + aprovação), **financeiro** (recebido, a receber, a pagar
  por parceiro, baixa automática de repasses) e edição do conteúdo do site (frota com fotos, rotas com
  preço fixo ou taxa fixa + valor por km, destinos populares, cidades, dados da empresa).
* **Hospedagem:** Netlify (app) + Supabase (PostgreSQL e fotos).

## Estrutura

```
frontend/            app Next.js (páginas, API em /api, painel /admin)
  server/            regra de negócio, banco, autenticação (só servidor)
  tests/             testes automatizados (Postgres real em memória)
supabase/            migrações SQL, seed e configuração (fonte única do esquema)
netlify.toml         configuração de build da Netlify
```

## Rodar localmente (sem Docker, sem nuvem)

```bash
cd frontend
npm install
npm run setup                                 # cria o .env.local com segredos aleatórios (sem isso a API dá erro)
npm run db:migrar && npm run db:seed
npm run admin:criar -- admin@rocha.local     # pede uma senha (entre 8 e 16 caracteres)
npm run dev                                   # http://localhost:3000  |  painel: /admin
npm test && npm run typecheck
```

Detalhes de variáveis de ambiente: `frontend/.env.example`.

## Publicar em produção: Netlify + Supabase

**Arquitetura:** navegador → Netlify (Next.js, páginas + API em funções serverless) → conexão direta TLS
(papel `app_server`, sem acesso público) → Supabase (PostgreSQL com RLS em todas as tabelas + Storage de
fotos). O navegador nunca fala com a Supabase diretamente.

**1. Supabase**
1. Crie o projeto numa região da UE (Paris `eu-west-3` ou Frankfurt `eu-central-1`).
2. Aplique o esquema: no SQL Editor, cole e rode **todos** os arquivos de `supabase/migrations/` **em ordem de nome**
   (hoje: `..._schema.sql`, `..._storage.sql`, `..._orcamentos.sql`, `..._permissoes.sql`). Toda migração nova entra no fim dessa lista.
3. (Opcional) carregue o conteúdo inicial rodando `supabase/seed.sql`.
4. Defina a senha do papel da aplicação (a migração cria `app_server` sem login):
   ```sql
   alter role app_server with login password '<SENHA-LONGA-ALEATORIA>';  -- openssl rand -base64 32
   ```
5. Copie a connection string do **Pooler → modo transação (porta 6543)** e troque o usuário por
   `app_server.<ref-do-projeto>`:
   `postgresql://app_server.<ref>:<SENHA>@<host-do-pooler>:6543/postgres`
   — copie o host exato do painel (Connect → Transaction pooler); não invente o número do cluster (`aws-0`, `aws-1`...).
6. Ative *Enforce SSL* e confirme os backups diários (Database → Backups).
7. O bucket `site-media` (público, só leitura, 5 MB, JPG/PNG/WebP) é criado pela migração. Copie a
   `service_role key` (Settings → API) — secreta, só no servidor.

**2. Netlify**

*Add new site → Import from Git* (o `netlify.toml` da raiz já define `base = frontend`). Em
*Site configuration → Environment variables*, cadastre (marque **Contains secret values** nos segredos):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string do pooler com `app_server` |
| `SITE_URL` / `NEXT_PUBLIC_SITE_URL` | `https://seu-dominio.fr` |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` (cifra o segredo do MFA) |
| `ADMIN_REQUIRE_MFA` | `true` |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | chave de serviço |
| `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE` | painel da SumUp (ver passo 3) |
| `RESEND_API_KEY`, `EMAIL_REMETENTE` | e-mails automáticos (ver passo 4) |

Todas as opções (com valores padrão) estão em `frontend/.env.example`. Com `NODE_ENV=production` o
servidor **recusa iniciar** se `JWT_SECRET`, `APP_ENCRYPTION_KEY`, `DATABASE_URL` ou `SITE_URL` forem
inseguros — não defina `PAGAMENTO_SIMULADO` em produção. Escolha a região das funções na UE, ative
domínio próprio com HTTPS/Force HTTPS. A função agendada `netlify/functions/manutencao.mts` roda todo
dia (limpa contadores e logs antigos).

**3. SumUp**

Não há webhook a cadastrar no painel deles: o servidor cria cada cobrança (`POST /v0.1/checkouts`, com a
chave secreta, nunca no navegador) já informando `return_url = https://seu-dominio.fr/api/webhook/sumup`
(só funciona com `SITE_URL` em `https://`). O sistema não confia no conteúdo do webhook — confirma o
pagamento consultando a API da SumUp e registra o valor realmente cobrado. O valor cobrado é sempre
calculado no servidor: no mínimo `sinal_percentual` (20% ou mais) do total, ou o total; a reserva só é
considerada concluída depois disso. Cada cobrança expira junto com a retenção do veículo (`HOLD_PENDENTE_MINUTOS`).

Para ativar:

1. **Teste (sandbox):** em [me.sumup.com](https://me.sumup.com) → *Settings → For Developers*, aba *Sandboxes*, crie
   uma conta de teste. Gere uma API key dessa conta (*Toolkit → API Keys*) e anote o *merchant code* dela.
2. Na Netlify, cadastre `SUMUP_API_KEY` (segredo) e `SUMUP_MERCHANT_CODE` e faça um novo deploy.
3. Faça uma reserva de ponta a ponta com os
   [cartões de teste](https://developer.sumup.com/online-payments/testing/) (inclusive um com 3D Secure). A
   reserva deve aparecer no painel como paga sozinha. No sandbox, cobranças de exatamente 11 € falham de
   propósito, o que serve para testar a recusa. Exemplo: o sinal de 20% de um trajeto de 55 €.
4. **Produção:** troque as duas variáveis pela API key e pelo merchant code da conta real, faça um novo deploy
   e um pagamento real de valor baixo (sinal e integral). Depois, estorne pelo painel da SumUp.

**4. E-mails automáticos (Resend)**

O sistema envia, pelo [Resend](https://resend.com):

* ao **cliente**, quando um pagamento online é confirmado: confirmação da reserva no idioma escolhido no site
  (código, trajeto, datas, veículo, valor pago e, se houver, o saldo com link para pagar);
* à **empresa** (e-mail de contato em *Admin → Configurações*): aviso de pagamento recebido e de novo pedido de orçamento.

Para ligar: crie a conta (região UE), verifique o domínio do site (registros DNS que o Resend mostra), gere
uma API key e cadastre na Netlify `RESEND_API_KEY` e `EMAIL_REMETENTE` (ex.: `Rocha Executive Transport
<reservas@seu-dominio.fr>`, com o domínio verificado). Sem essas variáveis nada é enviado e o resto do site
funciona normalmente; uma falha no envio nunca impede o registro de um pagamento.

**5. Primeiro administrador**

Com a `DATABASE_URL` de produção em uma máquina de confiança:

```bash
cd frontend
DATABASE_URL='<string de produção>' npm run admin:criar -- dono@suaempresa.fr
```

Pede uma senha (entre 8 e 16 caracteres) sem mostrá-la na tela. Depois, em `/admin/login`, o painel exige
configurar o aplicativo autenticador (MFA). O mesmo comando redefine a senha e derruba todas as sessões
(serve também como recuperação de acesso).

**6. Checklist antes de divulgar**

- [ ] `npm test`, `npm run typecheck` e `npm run build` sem erros.
- [ ] MFA ativo no admin; senha forte; nenhum admin de teste.
- [ ] Pagamento real de teste (sinal e integral) com valor baixo, confirmando sozinho.
- [ ] Preencher em **Admin → Dados da empresa**: SIRET, endereço, e-mail, forma jurídica, diretor de
      publicação e mediador de consumo (alimentam as *mentions légales* e as CGV).
- [ ] Revisão jurídica das CGV (`/conditions-generales`), Política de Confidentialité e Mentions légales
      (textos em `frontend/lib/legal.ts`, francês + 5 traduções).
- [ ] E-mails ligados (Resend com domínio verificado) e e-mail de contato preenchido no painel; um pagamento
      de teste chega ao cliente e à empresa.
- [ ] Domínio com HTTPS e cabeçalhos (confira em securityheaders.com).
- [ ] Backups da Supabase confirmados, com um teste de restauração feito.

## Compartilhar o ambiente local para outra pessoa testar

Com `npm run dev` rodando, abra um túnel temporário (`ngrok http 3000` ou `cloudflared tunnel --url
http://localhost:3000`). O painel `/admin` e a API `/api/admin/*` **não existem** por esse link público
(404, mesmo com o administrador logado): em desenvolvimento eles só respondem a acesso direto do próprio
computador (`ADMIN_ACESSO=local`). Sem chave da SumUp, `PAGAMENTO_SIMULADO=true` (já vem no
`.env.local` de desenvolvimento) mostra um painel de teste que aprova/recusa pagamento sem cobrar nada.

## Segurança (resumo)

Autenticação com hash `scrypt`, senha de 8–16 caracteres com 3 tipos de caractere, MFA (TOTP) obrigatório
em produção, sessão com cookie `HttpOnly`/`SameSite=Strict` que expira após 30 min de inatividade (teto
de 8 h), bloqueio por força bruta, verificação de origem (CSRF), todas as consultas SQL parametrizadas,
RLS ativo e forçado em todas as tabelas do Supabase (o papel da aplicação não tem privilégio de alterar
o esquema), dados de cartão nunca passam pelo servidor (SumUp, escopo PCI SAQ A), upload de imagem
validado pelo conteúdo do arquivo (não pela extensão), e auditoria de toda ação administrativa.

**Riscos conhecidos:** os textos jurídicos precisam de revisão de um advogado antes do lançamento. Rode
`npm audit --omit=dev` de tempos em tempos e atualize o Next.js quando sair correção de segurança.
