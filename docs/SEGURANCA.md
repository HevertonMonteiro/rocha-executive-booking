# Segurança da informação

Referências usadas: OWASP Top 10 / ASVS (nível 2), RGPD (UE) / LGPD, PCI DSS (escopo SAQ A),
recomendações da CNIL e da ANSSI para aplicações web.

## Controles implementados

| Área | Controle | Onde |
|---|---|---|
| **Autenticação do admin** | E-mail + senha com hash `scrypt` (N=2¹⁴, r=8, p=5, sal por senha), política de senha (≥12 caracteres, 3 tipos), tempo de resposta constante (não revela e-mails existentes) | `server/auth/senha.ts` |
| **MFA (TOTP)** | Obrigatório em produção; segredo **cifrado** (AES-256-GCM) no banco; código não reutilizável (anti-replay) | `server/auth/mfa.ts`, `cifra.ts` |
| **Sessão** | JWT em cookie `HttpOnly` + `SameSite=Strict` + `Secure` (prod), sem `Domain` (só o navegador que fez login). **Desconecta após 30 min sem atividade** (renovado a cada uso) e tem teto absoluto de 8 h; trocar senha/MFA invalida todas as sessões (`sessao_versao`). O painel também sai sozinho no navegador após 30 min sem mouse/teclado | `server/auth/sessao.ts`, `AdminShell.tsx` |
| **Painel só no computador local** | Em desenvolvimento (`ADMIN_ACESSO=local`) `/admin` e `/api/admin/*` respondem **404** a qualquer acesso que não venha direto do `localhost` (link público/túnel, proxy, IP externo), mesmo com cookie válido | `lib/acessoLocal.ts`, `middleware.ts` |
| **Pagamento mínimo** | O cliente só conclui a reserva pagando ≥ 20% (piso não reduzível) ou o total; o valor é calculado **no servidor**; checkout revalida o horário antes de cobrar; admin não confirma sem o mínimo (exceto autorização explícita) | `server/servicos/pagamentos.ts`, `app/api/pagamentos/sumup/checkout` |
| **Força bruta** | Bloqueio por conta (5/15 min) e por IP; persistido no banco (funciona em serverless) | `app/api/admin/login` |
| **CSRF** | `SameSite=Strict` + verificação de `Origin` em toda requisição que altera dados | `server/http.ts` |
| **Autorização** | Todas as rotas `/api/admin/*` passam por `comAdmin` (sessão + MFA + origem + auditoria) | `server/http.ts` |
| **Auditoria** | Cada ação de escrita registra quem/o quê/quando/IP (sem corpo da requisição); retenção de 12 meses | tabela `auditoria_admin` |
| **Injeção SQL** | 100% das consultas parametrizadas; colunas dinâmicas só a partir de listas fixas no código | `server/db`, `server/crud.ts` |
| **Validação de entrada** | `zod` em todo corpo/consulta; campos extras descartados (sem *mass assignment*); tamanho máximo do corpo | `server/schemas.ts`, `entidades.ts` |
| **XSS / injeção de conteúdo** | React escapa saída; CSP restritiva; URLs de imagem só `/caminho` ou `https://` | `next.config.mjs` |
| **Cabeçalhos** | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sem `X-Powered-By`, `no-store` no admin/API | `next.config.mjs` |
| **Banco (Supabase)** | RLS **ligado e forçado** em todas as tabelas, sem política para `anon`/`authenticated`; papel `app_server` sem privilégio de DDL; TLS obrigatório | `supabase/migrations` |
| **Segredos** | Só em variáveis de ambiente; `.env*` ignorados no git; chave de serviço nunca vai ao navegador; produção falha ao iniciar com configuração fraca | `server/config.ts` |
| **Pagamentos** | Dados do cartão **nunca** passam pelo nosso servidor (formulário hospedado pela SumUp → escopo PCI SAQ A). Webhook **não é confiável**: o pagamento só é registrado depois de confirmado na API da SumUp, com o valor realmente cobrado; idempotente | `server/servicos/pagamentos.ts` |
| **Integridade financeira** | Dinheiro em centavos/`numeric`; travas de linha (`FOR UPDATE`) e *advisory lock* por veículo contra reserva/pagamento duplicado | `server/servicos/*` |
| **IDOR** | Fluxo público usa **código aleatório** (10 caracteres), nunca o ID sequencial; a consulta pública devolve só status/valores | `app/api/reservas/status` |
| **Upload** | Tipo pelo **conteúdo** (assinatura JPG/PNG/WebP), sem SVG, nome aleatório, limite 5 MB, só admin | `server/servicos/storage.ts` |
| **Abuso** | Limite de requisições nos endpoints públicos que gravam (reserva, parceiro, checkout); campo isca anti-robô | `server/http.ts` |
| **Erros** | O cliente nunca recebe detalhes internos (mensagem genérica; detalhe só no log do servidor) | `server/http.ts` |
| **Privacidade** | Fontes auto-hospedadas (nada é enviado ao Google); sem cookies de rastreamento nem analytics; dados na UE | `app/layout.tsx` |

**Pagamento de teste (`PAGAMENTO_SIMULADO`)**: só existe fora de production; o endpoint de simulação responde 404 e o servidor se recusa a iniciar em production se a variável estiver ligada.

## RGPD / LGPD

* **Dados tratados:** nome, e-mail, telefone, voo, observações da viagem; dados de contato/IBAN de parceiros.
* **Operadores:** Netlify (hospedagem), Supabase (banco/armazenamento), SumUp (pagamento) — assinar os DPAs.
* **Minimização/retenção:** logs e contadores expiram sozinhos (`manutencao.mts`); reservas e pagamentos são mantidos por obrigação contábil (10 anos na França).
* **Direitos dos titulares:** o admin edita clientes e pode excluir quem não tem reservas (Clientes → Excluir). Para anonimizar quem tem reservas, é um procedimento manual.
* **Quando usar analytics/ads:** é obrigatório um banner de consentimento (CNIL) **antes** de carregar qualquer rastreador.
* **Textos jurídicos:** CGV, Política de Confidentialité e Mentions légales em francês (base) com tradução em 6 idiomas (`frontend/lib/legal.ts`), alimentados pelos dados da empresa no painel. São modelos sólidos, **mas devem ser revisados por um advogado** antes do lançamento.
* **Formalidades francesas a cumprir fora do código:** SIRET/registro, adesão a um mediador de consumo, DPAs com Netlify/Supabase/SumUp.

## Riscos conhecidos e recomendações

1. **Next.js 14.2.x** tem avisos públicos (`npm audit`). Mitigações já aplicadas: sem Server Actions, sem `next/image`
   (otimizador desligado), autenticação **também validada em cada rota de API** (não depende só do middleware).
   Recomendado: migrar para a versão suportada mais recente do Next.js (com testes) antes ou logo após o lançamento.
2. **CSP** libera `frame-src https:` para o 3D Secure dos bancos via SumUp. Depois de validar o fluxo em produção,
   restrinja aos domínios efetivamente usados.
3. **Limite de requisições** é por IP/conta no banco: bom contra abuso simples. Para ataques volumétricos use as
   proteções de borda da Netlify (WAF/regras de taxa) e o *rate limiting* da Supabase.
4. **Contas de terceiros:** habilite MFA na Netlify, Supabase, SumUp, provedor de domínio e e-mail.
5. **Recuperação de acesso do admin** é por linha de comando (`npm run admin:criar`) — restrinja quem tem `DATABASE_URL`.
6. **Rotação de segredos:** trocar `JWT_SECRET` desconecta todos; trocar `APP_ENCRYPTION_KEY` exige reconfigurar o MFA.
7. **Monitoramento:** ative alertas de erro/uso na Netlify e na Supabase; revise `auditoria_admin` periodicamente (tela Segurança).

## Resposta a incidentes (resumo)

1. Suspeita de vazamento de sessão/senha → `npm run admin:criar` (redefine a senha e derruba as sessões) e troque `JWT_SECRET`.
2. Suspeita de vazamento do banco → rotacione a senha de `app_server` e a chave de serviço; avalie notificação à CNIL em até 72 h.
3. Pagamento divergente → tela da reserva mostra o valor efetivamente cobrado e o aviso de divergência.
