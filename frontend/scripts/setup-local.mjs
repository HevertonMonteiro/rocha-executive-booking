/**
 * Cria o frontend/.env.local para desenvolvimento, com segredos ALEATORIOS gerados agora.
 *   npm run setup
 * Nao sobrescreve um .env.local existente. Nunca use estes valores em producao.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local ja existe: nada a fazer.");
  process.exit(0);
}

const definir = (texto, chave, valor) => texto.replace(new RegExp(`^${chave}=.*$`, "m"), `${chave}=${valor}`);
let env = readFileSync(".env.example", "utf-8");
env = definir(env, "DATABASE_URL", "pglite:./.data/dev");
env = definir(env, "JWT_SECRET", randomBytes(48).toString("base64"));
env = definir(env, "APP_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
env = definir(env, "STORAGE_DRIVER", "local");
// Sem chave da SumUp, o checkout mostra um painel "MODE TEST" (nunca funciona em production).
env = definir(env, "PAGAMENTO_SIMULADO", "true");

writeFileSync(".env.local", env, { mode: 0o600 });
console.log(".env.local criado (banco local em arquivo, segredos aleatorios, pagamento de teste ligado).");
console.log("Proximo passo: npm run db:migrar && npm run db:seed && npm run admin:criar -- seu@email.com");
