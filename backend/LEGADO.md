# Backend Python (legado — não usado)

Esta pasta é o protótipo original em FastAPI. **A aplicação agora roda inteira no Next.js
(TypeScript) + Supabase**, porque a Netlify não executa servidores Python.

Toda a lógica (disponibilidade, reservas, pagamentos, painel admin) foi reescrita em
`frontend/server/` e o esquema do banco está em `supabase/migrations/`.
Pode ser removida quando você quiser; foi mantida apenas como referência.
