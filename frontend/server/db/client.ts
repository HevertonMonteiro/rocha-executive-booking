import "server-only";

/**
 * Acesso ao PostgreSQL com consultas SEMPRE parametrizadas ($1, $2...).
 *
 *  - Producao: driver `postgres` contra o pooler da Supabase (modo transacao).
 *  - Desenvolvimento/testes: PGlite (Postgres em WebAssembly) quando a
 *    DATABASE_URL comeca com `pglite:` (ex.: pglite:./.data/dev ou pglite:memory).
 *
 * Datas e timestamps voltam como texto (sem conversao de fuso pelo driver) e
 * numericos como string, para nao haver perda de precisao em dinheiro.
 */

export type Linha = Record<string, any>;

export interface Executor {
  query<T = Linha>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Executa um script com varios comandos (sem parametros): migracoes e seed. */
  exec(sql: string): Promise<void>;
}

export interface Banco extends Executor {
  transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const OIDS_DATA = [1082, 1114, 1184]; // date, timestamp, timestamptz

let instancia: Promise<Banco> | null = null;

async function abrirPglite(url: string): Promise<Banco> {
  const local = url.replace(/^pglite:/, "");
  if (local !== "memory") {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(local, { recursive: true });
  }
  // webpackIgnore: o PGlite so existe em desenvolvimento e nao vai para o bundle de producao.
  const { PGlite } = await import(/* webpackIgnore: true */ "@electric-sql/pglite");
  const parsers = Object.fromEntries(OIDS_DATA.map((oid) => [oid, (v: string) => v]));
  const pg = new PGlite(local === "memory" ? "memory://" : local, { parsers });
  await pg.exec("set time zone 'UTC'");

  const executor = (alvo: any): Executor => ({
    query: async (sql, params = []) => (await alvo.query(sql, params)).rows,
    exec: async (sql) => {
      await alvo.exec(sql);
    },
  });

  return {
    ...executor(pg),
    transaction: (fn) => pg.transaction((tx) => fn(executor(tx as any))),
    close: () => pg.close(),
  };
}

async function abrirPostgres(url: string): Promise<Banco> {
  const postgres = (await import("postgres")).default;
  const opcoes = {
    // Pooler da Supabase em modo transacao nao suporta prepared statements.
    prepare: false,
    max: 3, // funcoes serverless: poucas conexoes por instancia
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { TimeZone: "UTC" },
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    types: {
      date: {
        to: 1184,
        from: OIDS_DATA,
        serialize: (v: unknown) => String(v),
        parse: (v: string) => v,
      },
    },
  } as const;
  let sql = postgres(url, opcoes);

  // Funcoes serverless "congelam" entre invocacoes: uma conexao ja aberta pode
  // ficar presa nesse intervalo (o socket parece vivo, mas nunca mais responde)
  // sem que o driver perceba. Sem isto, uma consulta trava ate o gateway
  // desistir (dezenas de segundos). Aqui, apos 6s sem resposta, a conexao
  // suspeita e descartada; para SELECT (sempre seguro repetir) tenta de novo
  // numa conexao nova; para escrita, so falha rapido (nunca reenvia
  // automaticamente, para nao arriscar duplicar uma cobranca ou reserva).
  async function comLimiteDeTempo<T>(executar: () => Promise<T>, podeTentarDeNovo: boolean): Promise<T> {
    try {
      return await Promise.race([
        executar(),
        new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error("TIMEOUT_CONEXAO_BD")), 6000)),
      ]);
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "TIMEOUT_CONEXAO_BD") throw e;
      sql.end({ timeout: 0 }).catch(() => {});
      sql = postgres(url, opcoes);
      if (!podeTentarDeNovo) throw e;
      return executar();
    }
  }

  const executor = (alvo: () => any): Executor => ({
    query: (texto, params = []) => {
      const somenteLeitura = /^\s*(select|with)\b/i.test(texto);
      return comLimiteDeTempo(() => alvo().unsafe(texto, params as any[]), somenteLeitura);
    },
    exec: (texto) => comLimiteDeTempo(async () => void (await alvo().unsafe(texto)), false),
  });
  return {
    ...executor(() => sql),
    // Transacao nao usa o limite de tempo acima: cancelar uma promise em voo nao
    // cancela o COMMIT em andamento no servidor, e um "timeout" falso-positivo
    // poderia derrubar a conexao e avisar erro numa transacao que na verdade
    // teve sucesso — risco inaceitavel perto de pagamento/reserva.
    transaction: (fn) => sql.begin((tx) => fn(executor(() => tx))) as Promise<any>,
    close: () => sql.end({ timeout: 5 }),
  };
}

export function obterBanco(): Promise<Banco> {
  if (!instancia) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL nao configurada.");
    instancia = url.startsWith("pglite:") ? abrirPglite(url) : abrirPostgres(url);
    instancia.catch(() => (instancia = null));
  }
  return instancia;
}

/** Atalho: executa uma consulta e devolve as linhas. */
export async function consulta<T = Linha>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await obterBanco()).query<T>(sql, params);
}

export async function transacao<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  return (await obterBanco()).transaction(fn);
}

/** Uso em testes: reinicia a conexao singleton. */
export async function fecharBanco(): Promise<void> {
  if (instancia) {
    const banco = await instancia;
    instancia = null;
    await banco.close();
  }
}
