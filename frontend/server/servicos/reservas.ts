import "server-only";
import { randomInt } from "node:crypto";
import { config } from "../config";
import { transacao } from "../db/client";
import { deCentavos, paraCentavos } from "../dinheiro";
import { ErroHttp } from "../http";
import { paraMs } from "../tempo";
import { sugerirProximoHorario, verificarDisponibilidade, type TipoTrajeto } from "./disponibilidade";
import { SQL_PRECO_ROTA } from "./preco";

// Sem 0/O/1/I/L para evitar confusao ao ditar o codigo por telefone/WhatsApp.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function novoCodigoReserva(): string {
  return Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export function formatarDataFrancesa(iso: string): string {
  const d = new Date(paraMs(iso));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export interface DadosNovaReserva {
  origem_id: number;
  destino_id: number;
  veiculo_id: number;
  data_ida: string;
  tipo_trajeto: TipoTrajeto;
  data_volta?: string | null;
  numero_voo?: string | null;
  numero_voo_volta?: string | null;
  quantidade_passageiros: number;
  observacoes?: string | null;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  idioma?: string;
}

export async function criarReserva(d: DadosNovaReserva) {
  return transacao(async (tx) => {
    const [rota] = await tx.query<{
      id: number;
      tempo_estimado_minutos: number | null;
      capacidade_passageiros: number;
      preco: string;
    }>(
      `select r.id, r.tempo_estimado_minutos, v.capacidade_passageiros, ${SQL_PRECO_ROTA} as preco
         from rotas r join veiculos v on v.id = r.veiculo_id
        where r.origem_id = $1 and r.destino_id = $2 and r.veiculo_id = $3 and r.ativo and v.ativo`,
      [d.origem_id, d.destino_id, d.veiculo_id]
    );
    if (!rota) throw new ErroHttp(404, "Rota nao disponivel para esta combinacao de origem/destino/veiculo.", "ROTA_INDISPONIVEL");
    if (d.quantidade_passageiros > rota.capacidade_passageiros) {
      throw new ErroHttp(422, `Este veiculo comporta ate ${rota.capacidade_passageiros} passageiros.`, "CAPACIDADE", {
        max: rota.capacidade_passageiros,
      });
    }

    const [{ futuro }] = await tx.query<{ futuro: boolean }>(
      "select ($1::timestamp > (now() at time zone 'Europe/Paris')) as futuro",
      [d.data_ida]
    );
    if (!futuro) throw new ErroHttp(422, "A data da viagem deve ser futura.", "DATA_PASSADA");

    // Serializa reservas concorrentes do mesmo veiculo: sem isso, dois clientes
    // poderiam reservar o mesmo carro no mesmo horario ao mesmo tempo.
    await tx.query("select pg_advisory_xact_lock(1001, $1::int)", [d.veiculo_id]);

    const pedido = {
      dataIda: d.data_ida,
      tempoEstimadoMinutos: rota.tempo_estimado_minutos,
      tipoTrajeto: d.tipo_trajeto,
      dataVolta: d.data_volta ?? null,
    };
    if (!(await verificarDisponibilidade(tx, d.veiculo_id, pedido))) {
      const proximo = await sugerirProximoHorario(tx, d.veiculo_id, pedido);
      throw new ErroHttp(
        409,
        `Este veiculo acabou de ficar indisponivel nesse horario.${proximo ? ` Proximo horario disponivel: ${formatarDataFrancesa(proximo)}.` : ""}`,
        "INDISPONIVEL",
        { proximo: proximo ?? null }
      );
    }

    const email = d.cliente_email.trim().toLowerCase();
    const [cliente] = await tx.query<{ id: number }>(
      `insert into clientes (nome, email, telefone, idioma_preferido) values ($1, $2, $3, $4)
       on conflict (email) do update set email = excluded.email returning id`,
      [d.cliente_nome.trim(), email, d.cliente_telefone.trim(), d.idioma ?? "pt"]
    );

    const total = paraCentavos(rota.preco) * (d.tipo_trajeto === "return" ? 2 : 1);
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const codigo = novoCodigoReserva();
      const inseridas = await tx.query<{ id: number }>(
        `insert into reservas (codigo, cliente_id, passageiro_nome, passageiro_telefone, rota_id, veiculo_id, tipo_trajeto,
                               data_ida, data_volta, numero_voo, numero_voo_volta, quantidade_passageiros, observacoes, preco_total,
                               retido_ate)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now() + make_interval(mins => $15::int))
         on conflict (codigo) do nothing returning id`,
        [
          codigo,
          cliente.id,
          d.cliente_nome.trim(),
          d.cliente_telefone.trim(),
          rota.id,
          d.veiculo_id,
          d.tipo_trajeto,
          d.data_ida,
          d.tipo_trajeto === "return" ? d.data_volta : null,
          d.numero_voo?.trim() || null,
          d.numero_voo_volta?.trim() || null,
          d.quantidade_passageiros,
          d.observacoes?.trim() || null,
          deCentavos(total),
          config.holdPendenteMinutos,
        ]
      );
      if (inseridas.length) return { id: inseridas[0].id, codigo, precoTotalCentavos: total };
    }
    throw new Error("Nao foi possivel gerar um codigo de reserva unico.");
  });
}
