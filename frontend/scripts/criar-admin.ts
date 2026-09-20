/**
 * Cria (ou redefine a senha de) um administrador. Tambem serve para recuperar o acesso.
 *
 *   npm run admin:criar -- email@dominio.com
 *
 * A senha e pedida no terminal (sem aparecer na tela) ou lida de ADMIN_PASSWORD.
 * Nunca passe a senha como argumento de linha de comando (fica no historico do shell).
 * Requer DATABASE_URL (a mesma usada pela aplicacao).
 */
import { createInterface } from "node:readline";
import { hashSenha, validarForcaSenha } from "../server/auth/senha";
import { consulta, fecharBanco } from "../server/db/client";

process.env.DATABASE_URL ||= "pglite:./.data/dev";

function perguntarSenha(texto: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const saida = (rl as any)._writeToOutput;
    (rl as any)._writeToOutput = function (s: string) {
      if (s.includes(texto)) saida.call(rl, s);
      else if (s === "\r\n" || s === "\n") saida.call(rl, s);
    };
    rl.question(texto, (resposta) => {
      rl.close();
      resolve(resposta);
    });
  });
}

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Uso: npm run admin:criar -- email@dominio.com");
    process.exit(1);
  }
  const senha = process.env.ADMIN_PASSWORD || (await perguntarSenha("Senha do administrador: "));
  const problema = validarForcaSenha(senha);
  if (problema) {
    console.error(problema);
    process.exit(1);
  }
  const hash = await hashSenha(senha);
  const [existente] = await consulta<{ id: number }>("select id from admins where email = $1", [email]);
  if (existente) {
    // Redefinir: tambem derruba todas as sessoes abertas.
    await consulta("update admins set senha_hash = $2, ativo = true, sessao_versao = sessao_versao + 1 where id = $1", [existente.id, hash]);
    console.log(`Senha redefinida para ${email}. Sessoes anteriores foram encerradas.`);
  } else {
    await consulta("insert into admins (email, senha_hash) values ($1, $2)", [email, hash]);
    console.log(`Administrador ${email} criado.`);
  }
  await fecharBanco();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
