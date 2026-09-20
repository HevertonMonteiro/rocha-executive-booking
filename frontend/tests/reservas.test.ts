import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { consulta, obterBanco } from "@/server/db/client";
import { GET as rotasGET } from "@/app/api/rotas/route";
import { POST as criarPOST } from "@/app/api/reservas/criar/route";
import { verificarDisponibilidade, sugerirProximoHorario } from "@/server/servicos/disponibilidade";
import { criarReserva } from "@/server/servicos/reservas";
import { ErroHttp } from "@/server/http";
import { dadosReserva, futuro, prepararBanco, requisicao } from "./ajuda";

beforeAll(async () => {
  await prepararBanco();
});

beforeEach(async () => {
  await consulta("delete from limites_taxa");
});

const ctx = { params: {} };

describe("preco das rotas", () => {
  it("usa o preco fixo por padrao", async () => {
    const res = await rotasGET(requisicao("/api/rotas?origem_id=1&destino_id=3"), ctx);
    const rotas = await res.json();
    expect(rotas.map((r: any) => r.preco_fixo)).toEqual(["65.00", "90.00", "110.00"]);
    expect(rotas[0].disponivel).toBeNull();
  });

  it("no modo km calcula valor fixo do veiculo + km * valor por km", async () => {
    // Hatch: base 45 + 30 km * 1.80 = 99.00
    await consulta("update rotas set modo_preco = 'km', distancia_km = 30 where origem_id = 1 and destino_id = 3 and veiculo_id = 1");
    const rotas = await (await rotasGET(requisicao("/api/rotas?origem_id=1&destino_id=3"), ctx)).json();
    const hatch = rotas.find((r: any) => r.veiculo.id === 1);
    expect(hatch.preco_fixo).toBe("99.00");
    await consulta("update rotas set modo_preco = 'fixo', distancia_km = null where origem_id = 1 and destino_id = 3 and veiculo_id = 1");
  });

  it("nao lista veiculo inativo", async () => {
    await consulta("update veiculos set ativo = false where id = 3");
    const rotas = await (await rotasGET(requisicao("/api/rotas?origem_id=1&destino_id=3"), ctx)).json();
    expect(rotas).toHaveLength(2);
    await consulta("update veiculos set ativo = true where id = 3");
  });
});

describe("criacao de reserva e disponibilidade", () => {
  it("cria a reserva com codigo publico nao sequencial e preco correto", async () => {
    const res = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: futuro(10) }) }), ctx);
    expect(res.status).toBe(201);
    const corpo = await res.json();
    expect(corpo.codigo).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
    expect(corpo.preco_total).toBe("65.00");
  });

  it("ida e volta cobra o dobro", async () => {
    const res = await criarPOST(
      requisicao("/api/reservas/criar", {
        corpo: dadosReserva({ veiculo_id: 2, data_ida: futuro(20), tipo_trajeto: "return", data_volta: futuro(22), cliente_email: "b@example.com" }),
      }),
      ctx
    );
    expect((await res.json()).preco_total).toBe("180.00");
  });

  it("bloqueia horario sobreposto e sugere o proximo livre (ida 10:00 + 45min x2 + 15min = 11:45)", async () => {
    const banco = await obterBanco();
    const dia = futuro(10).slice(0, 10);
    // Ja existe reserva do veiculo 1 em dia+10 as 10:00.
    const pedido = (h: string) => ({ dataIda: `${dia}T${h}:00`, tempoEstimadoMinutos: 45, tipoTrajeto: "one_way" as const });
    expect(await verificarDisponibilidade(banco, 1, pedido("10:15"))).toBe(false);
    expect(await verificarDisponibilidade(banco, 1, pedido("11:44"))).toBe(false);
    expect(await verificarDisponibilidade(banco, 1, pedido("11:45"))).toBe(true); // limite exclusivo
    expect(await verificarDisponibilidade(banco, 2, pedido("10:15"))).toBe(true); // outro veiculo
    expect(await sugerirProximoHorario(banco, 1, pedido("10:15"))).toBe(`${dia}T11:45:00`);

    const res = await criarPOST(
      requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: `${dia}T10:30:00`, cliente_email: "c@example.com" }) }),
      ctx
    );
    expect(res.status).toBe(409);
    expect((await res.json()).detail).toContain("Proximo horario disponivel");
  });

  it("agenda de ida e volta segura o veiculo ate depois do retorno", async () => {
    const banco = await obterBanco();
    // Veiculo 2 esta reservado de futuro(20) ate futuro(22)+45+15min.
    const d22 = futuro(22).slice(0, 10);
    const pedido = (h: string) => ({ dataIda: `${d22}T${h}:00`, tempoEstimadoMinutos: 45, tipoTrajeto: "one_way" as const });
    expect(await verificarDisponibilidade(banco, 2, pedido("10:30"))).toBe(false);
    expect(await verificarDisponibilidade(banco, 2, pedido("11:00"))).toBe(true);
  });

  it("reserva cancelada libera o horario", async () => {
    const banco = await obterBanco();
    const dia = futuro(10).slice(0, 10);
    const pedido = { dataIda: `${dia}T10:15:00`, tempoEstimadoMinutos: 45, tipoTrajeto: "one_way" as const };
    await consulta("update reservas set status = 'cancelado' where veiculo_id = 1");
    expect(await verificarDisponibilidade(banco, 1, pedido)).toBe(true);
    await consulta("update reservas set status = 'pendente' where veiculo_id = 1");
  });

  it("reserva pendente e nao paga deixa de segurar o veiculo depois do prazo", async () => {
    const banco = await obterBanco();
    const dia = futuro(10).slice(0, 10);
    const pedido = { dataIda: `${dia}T10:15:00`, tempoEstimadoMinutos: 45, tipoTrajeto: "one_way" as const };
    await consulta("update reservas set retido_ate = now() - interval '2 hours' where veiculo_id = 1");
    expect(await verificarDisponibilidade(banco, 1, pedido)).toBe(true);
    await consulta("update reservas set status_pagamento = 'parcial' where veiculo_id = 1"); // pagou sinal: segura de novo
    expect(await verificarDisponibilidade(banco, 1, pedido)).toBe(false);
  });

  it("rejeita passageiros acima da capacidade, data passada e origem = destino", async () => {
    const r1 = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ quantidade_passageiros: 5, data_ida: futuro(40) }) }), ctx);
    expect(r1.status).toBe(422);
    const r2 = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: "2020-01-01T10:00:00" }) }), ctx);
    expect(r2.status).toBe(422);
    const r3 = await criarPOST(requisicao("/api/reservas/criar", { corpo: dadosReserva({ destino_id: 1 }) }), ctx);
    expect(r3.status).toBe(422);
  });

  it("duas reservas simultaneas do mesmo veiculo/horario: so uma vence", async () => {
    const dados = (email: string) => dadosReserva({ veiculo_id: 3, quantidade_passageiros: 4, data_ida: futuro(50), cliente_email: email });
    const resultados = await Promise.allSettled([criarReserva(dados("x@example.com")), criarReserva(dados("y@example.com"))]);
    const ok = resultados.filter((r) => r.status === "fulfilled");
    const negadas = resultados.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(negadas[0].reason).toBeInstanceOf(ErroHttp);
    expect((negadas[0].reason as ErroHttp).status).toBe(409);
  });

  it("nao sobrescreve os dados de um cliente existente e guarda o contato da viagem", async () => {
    await criarReserva(dadosReserva({ data_ida: futuro(60), cliente_nome: "Outro Nome", cliente_telefone: "+33611111111" }));
    const [c] = await consulta("select nome, telefone from clientes where email = 'maria@example.com'");
    expect(c.nome).toBe("Maria Teste");
    const [r] = await consulta("select passageiro_nome, passageiro_telefone from reservas order by id desc limit 1");
    expect(r.passageiro_nome).toBe("Outro Nome");
  });
});
