/**
 * Manutencao diaria do banco (Netlify Scheduled Function).
 * Retencao minima de dados, conforme o principio da minimizacao do RGPD:
 *  - contadores do limitador de requisicoes: 1 dia
 *  - trilha de auditoria do painel: 12 meses
 *  - eventos brutos de webhook: 13 meses
 *  - reservas que NUNCA receberam pagamento e tem mais de 24 h: viram "cancelado" (limpa o painel;
 *    o horario ja estava liberado desde o fim da retencao de 30 min)
 * Reservas e pagamentos NAO sao apagados (obrigacao contabil na Franca: 10 anos).
 */
import postgres from "postgres";

export default async () => {
  const url = process.env.DATABASE_URL;
  if (!url) return new Response("DATABASE_URL ausente", { status: 500 });

  const sql = postgres(url, { prepare: false, max: 1, ssl: "require", connect_timeout: 10 });
  try {
    await sql`delete from limites_taxa where criado_em < now() - interval '1 day'`;
    await sql`delete from auditoria_admin where criado_em < now() - interval '12 months'`;
    await sql`delete from pagamento_logs where recebido_em < now() - interval '13 months'`;
    await sql`update reservas set status = 'cancelado', updated_at = now()
               where status = 'pendente' and status_pagamento = 'pendente' and created_at < now() - interval '24 hours'`;
    return new Response("ok");
  } finally {
    await sql.end({ timeout: 5 });
  }
};

export const config = { schedule: "@daily" };
