import "server-only";
import { consulta } from "../db/client";

export interface DadosSolicitacaoOrcamento {
  origem_id?: number | null;
  origem_texto: string;
  destino_id?: number | null;
  destino_texto: string;
  tipo_trajeto: "one_way" | "return";
  data_ida: string;
  data_volta?: string | null;
  quantidade_passageiros: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email?: string | null;
  observacoes?: string | null;
}

// Origem e/ou destino digitados nao batem com nenhuma cidade cadastrada: sem
// rota, sem preco automatico. So registra o pedido para o gestor responder
// manualmente pelo painel.
export async function criarSolicitacaoOrcamento(d: DadosSolicitacaoOrcamento): Promise<{ id: number }> {
  const [linha] = await consulta<{ id: number }>(
    `insert into solicitacoes_orcamento
       (origem_id, origem_texto, destino_id, destino_texto, tipo_trajeto, data_ida, data_volta,
        quantidade_passageiros, cliente_nome, cliente_telefone, cliente_email, observacoes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning id`,
    [
      d.origem_id ?? null,
      d.origem_texto.trim(),
      d.destino_id ?? null,
      d.destino_texto.trim(),
      d.tipo_trajeto,
      d.data_ida,
      d.tipo_trajeto === "return" ? d.data_volta : null,
      d.quantidade_passageiros,
      d.cliente_nome.trim(),
      d.cliente_telefone.trim(),
      d.cliente_email?.trim().toLowerCase() || null,
      d.observacoes?.trim() || null,
    ]
  );
  return { id: linha.id };
}
