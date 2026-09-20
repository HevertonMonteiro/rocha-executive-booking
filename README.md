# Rocha Executive Transport — reservas de transfer executivo (França)

Site de captação e reservas + painel administrativo.

* **Site público** (Next.js 14): busca, escolha de veículo com disponibilidade em tempo real,
  pagamento de **sinal (padrão 20%) ou integral** via SumUp, FAQ, página de parceiros, SEO para a França.
* **Painel `/admin`**: reservas (recebe → destina parceiro → confirma → finaliza), pagamentos e
  status, clientes, parceiros (solicitações + aprovação), **financeiro** (recebido, a receber, a pagar
  por parceiro, baixa automática de repasses) e edição do conteúdo do site (frota com fotos, rotas com
  preço fixo ou taxa fixa + valor por km, destinos populares, cidades, dados da empresa).
* **Hospedagem prevista:** Netlify (app) + Supabase (PostgreSQL e fotos). Nada foi publicado.

## Estrutura

```
frontend/            app Next.js (páginas, API em /api, painel /admin)
  server/            regra de negócio, banco, autenticação (só servidor)
  tests/             62 testes automatizados (Postgres real em memória)
supabase/            migrações SQL, seed e configuração (fonte única do esquema)
docs/PENDENCIAS.md   o que falta conectar (comece por aqui)
docs/DEPLOY.md      passo a passo Netlify + Supabase
docs/SEGURANCA.md   controles de segurança, RGPD e riscos conhecidos
netlify.toml         configuração de build da Netlify
backend/             protótipo Python antigo (legado, sem uso)
```

## Rodar localmente (sem Docker, sem nuvem)

```bash
cd frontend
npm install
npm run setup                                 # cria o .env.local com segredos aleatórios (sem isso a API dá erro)
npm run db:migrar && npm run db:seed
npm run admin:criar -- admin@rocha.local     # pede uma senha (mín. 12 caracteres)
npm run dev                                   # http://localhost:3000  |  painel: /admin
npm test && npm run typecheck
```

Detalhes de variáveis de ambiente: `frontend/.env.example`.
