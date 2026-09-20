import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { obterBanco } from "@/server/db/client";
import { migrar } from "@/server/db/migrar";

export async function prepararBanco() {
  const remoto = process.env.TEST_DATABASE_URL;
  if (remoto) {
    // Os testes APAGAM o schema public: so rodam em banco LOCAL descartavel, nunca em Supabase/producao.
    const host = new URL(remoto).hostname;
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
      throw new Error(`TEST_DATABASE_URL aponta para "${host}": os testes so podem rodar em banco local descartavel.`);
    }
    const b = await obterBanco();
    await b.exec("reset role; drop schema if exists public cascade; create schema public;");
  }
  await migrar();
  const banco = await obterBanco();
  await banco.exec(await readFile(path.resolve(process.cwd(), "..", "supabase", "seed.sql"), "utf-8"));
  // Simula producao: o app conecta como `app_server` (sem superuser, sujeito a RLS e sem DDL).
  if (process.env.TEST_SET_ROLE) await banco.exec(`set role ${process.env.TEST_SET_ROLE}`);
  return banco;
}

/** 'AAAA-MM-DDTHH:MM:00' daqui a N dias (sempre no futuro). */
export function futuro(dias: number, hora = "10:00"): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T${hora}:00`;
}

export function requisicao(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown; cookie?: string; origem?: string; headers?: Record<string, string> } = {}
) {
  // Um navegador sempre envia Host; sem ele o painel (modo "local") considera a requisicao externa.
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000", ...(opcoes.headers ?? {}) };
  if (opcoes.cookie) headers.cookie = opcoes.cookie;
  if (opcoes.origem) headers.origin = opcoes.origem;
  return new NextRequest(`http://localhost:3000${caminho}`, {
    method: opcoes.metodo ?? (opcoes.corpo ? "POST" : "GET"),
    headers,
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });
}

export const dadosReserva = (extra: Record<string, unknown> = {}) => ({
  origem_id: 1,
  destino_id: 3,
  veiculo_id: 1,
  data_ida: futuro(10),
  tipo_trajeto: "one_way" as "one_way" | "return",
  quantidade_passageiros: 2,
  cliente_nome: "Maria Teste",
  cliente_email: "maria@example.com",
  cliente_telefone: "+33600000000",
  ...extra,
});
