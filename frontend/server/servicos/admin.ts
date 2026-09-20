import "server-only";
import { ErroHttp } from "../http";

/** Monta clausulas WHERE com parametros posicionais (sem concatenar valores do usuario). */
export class Filtro {
  private partes: string[] = [];
  readonly params: unknown[] = [];

  adicionar(sql: (posicao: string) => string, valor: unknown) {
    if (valor === undefined || valor === null || valor === "") return this;
    this.params.push(valor);
    this.partes.push(sql(`$${this.params.length}`));
    return this;
  }

  get where(): string {
    return this.partes.length ? `where ${this.partes.join(" and ")}` : "";
  }
}

export const SQL_RESERVA_RESUMO = `
  select r.id, r.codigo, r.status, r.status_pagamento, r.tipo_pagamento, r.tipo_trajeto,
         r.data_ida::text as data_ida, r.data_volta::text as data_volta,
         r.preco_total, r.quantidade_passageiros, r.numero_voo,
         r.passageiro_nome, r.passageiro_telefone, c.id as cliente_id, c.email as cliente_email,
         o.nome as origem, d.nome as destino, v.nome as veiculo,
         r.parceiro_id, p.nome as parceiro_nome, p.empresa as parceiro_empresa,
         r.valor_parceiro, r.repasse_id,
         coalesce((select sum(pg.valor) from pagamentos pg where pg.reserva_id = r.id), 0) as recebido,
         r.created_at::text as created_at
    from reservas r
    join clientes c on c.id = r.cliente_id
    join rotas ro on ro.id = r.rota_id
    join cidades o on o.id = ro.origem_id
    join cidades d on d.id = ro.destino_id
    join veiculos v on v.id = r.veiculo_id
    left join parceiros p on p.id = r.parceiro_id`;

export function paginacao(pagina: number, limite: number) {
  const lim = Math.min(Math.max(limite, 1), 100);
  return { limite: lim, deslocamento: (Math.max(pagina, 1) - 1) * lim };
}

export function exigir<T>(valor: T | undefined | null, mensagem: string, status = 404): T {
  if (valor === undefined || valor === null) throw new ErroHttp(status, mensagem);
  return valor;
}
