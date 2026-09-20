# Guia para quem vai conectar o projeto (Supabase, Netlify, SumUp)

## O que já foi verificado (localmente)
* 62 testes automáticos passam, inclusive rodando pelo driver real `postgres` (o mesmo da Supabase) e como o papel restrito `app_server`.
* Segurança por linha (RLS): `anon`/`authenticated` são negados em todas as tabelas; `app_server` lê/grava mas não altera o esquema.
* Fluxo completo no navegador: reserva → pagamento (sinal ≥ 20% ou integral) → admin destina parceiro → confirma → finaliza → repasse; MFA obrigatório; sessão de 30 min; painel só no computador local.
* Responsivo: 10 páginas públicas + 12 do painel em 360, 390, 768 e 1280 px, sem rolagem horizontal.
* Build de produção (`npm run build`), `npm run typecheck` e `npm test` sem erros.

## O que NÃO dá para verificar sem as contas reais (faça nesta ordem)
1. **Supabase**: criar o projeto (região UE), aplicar `supabase/migrations`, definir a senha do papel `app_server`, montar a `DATABASE_URL` do pooler (porta 6543) — `docs/DEPLOY.md`, seção 1.
   Depois rode a suíte contra um Postgres **local** com o mesmo esquema se quiser: `TEST_DATABASE_URL=postgres://...@localhost:5432/teste TEST_SET_ROLE=app_server npm test`
   (os testes **apagam** o schema `public`: por segurança só aceitam host local).
2. **Storage**: com `STORAGE_DRIVER=supabase`, subir uma foto em Admin → Frota e conferir que aparece no site (bucket `site-media`; o CSP já libera o host do `SUPABASE_URL`).
3. **SumUp (sandbox)**: chave + `merchant_code`; fazer um pagamento de sinal e um integral. Confirmar no admin que o valor entrou sozinho (webhook via `return_url`, exige `SITE_URL` https). Se o formulário do cartão/3D Secure for bloqueado, veja o console (CSP em `next.config.mjs`).
4. **Netlify**: variáveis de ambiente (`.env.example`), região das funções na UE, domínio + HTTPS. `PAGAMENTO_SIMULADO` **não** pode existir. Conferir os cabeçalhos em securityheaders.com.
5. **Primeiro admin**: `npm run admin:criar -- email` com a `DATABASE_URL` de produção; entrar e ativar o MFA.

## Ainda não existe / decisões pendentes
* **E-mails transacionais** (confirmação/voucher) — não há envio; a comunicação é por WhatsApp. Escolher um provedor na UE.
* **Textos jurídicos** (`frontend/lib/legal.ts`) — revisão por advogado; preencher SIRET, endereço, e-mail, forma jurídica, diretor de publicação e mediador em Admin → Dados da empresa. Confirmar a política de cancelamento tardio.
* **Next.js 14.2.x** tem avisos públicos no `npm audit`; mitigados (sem Server Actions, sem `next/image`, auth validada também na API), mas planeje a atualização.
* Conteúdo do banco (nomes de destinos, descrições) é de **um idioma só** (francês no seed); só a interface é traduzida.
* Selo "★ 4.9/5 Avaliações" (rodapé) é texto fixo: remover se não houver avaliações reais.
* Mensagens de erro do painel (admin) vêm do servidor sem acentos: cosmético.
* `backend/` (Python) é legado e não é usado.
