/**
 * Utilitario de banco para desenvolvimento local:
 *   npx tsx scripts/db.ts migrar   -> aplica supabase/migrations
 *   npx tsx scripts/db.ts seed     -> aplica supabase/seed.sql (idempotente)
 * Le DATABASE_URL do ambiente (padrao local: pglite:./.data/dev).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { obterBanco, fecharBanco } from "../server/db/client";
import { migrar } from "../server/db/migrar";

process.env.DATABASE_URL ||= "pglite:./.data/dev";

async function main() {
  const comando = process.argv[2];
  if (comando === "migrar") {
    const aplicadas = await migrar();
    console.log(aplicadas.length ? `Migracoes aplicadas: ${aplicadas.join(", ")}` : "Banco ja esta atualizado.");
  } else if (comando === "seed") {
    const banco = await obterBanco();
    await banco.exec(await readFile(path.resolve(process.cwd(), "..", "supabase", "seed.sql"), "utf-8"));
    console.log("Seed executado.");
  } else {
    console.error("Uso: tsx scripts/db.ts <migrar|seed>");
    process.exitCode = 1;
  }
  await fecharBanco();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
