import { beforeAll, describe, expect, it } from "vitest";
import { consulta } from "@/server/db/client";
import { hashSenha } from "@/server/auth/senha";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { POST as orcamentoPOST } from "@/app/api/orcamentos/route";
import { GET as orcamentosGET } from "@/app/api/admin/orcamentos/route";
import { PATCH as orcamentoPATCH } from "@/app/api/admin/orcamentos/[id]/route";
import { futuro, prepararBanco, requisicao } from "./ajuda";

const ORIGEM = "http://localhost:3000";
const SENHA = "Senha-Forte-123!";
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
let cookie = "";

beforeAll(async () => {
  await prepararBanco();
  await consulta("insert into admins (email, senha_hash) values ($1, $2)", ["orcamento@rocha.fr", await hashSenha(SENHA)]);
  const res = await loginPOST(requisicao("/api/admin/login", { corpo: { email: "orcamento@rocha.fr", senha: SENHA }, origem: ORIGEM }));
  cookie = res.headers.get("set-cookie")!.split(";")[0];
});

const dadosOrcamento = (extra: Record<string, unknown> = {}) => ({
  origem_texto: "Château de Chantilly",
  destino_id: 3,
  destino_texto: "Paris (Centre)",
  data_ida: futuro(12),
  quantidade_passageiros: 3,
  cliente_nome: "Ana Cliente",
  cliente_telefone: "+33611111111",
  ...extra,
});

// Cada teste usa um IP proprio para nao esbarrar no limite de pedidos de outro teste.
const pedir = (corpo: unknown, ip = "198.51.100.1") =>
  orcamentoPOST(requisicao("/api/orcamentos", { corpo, headers: { "x-forwarded-for": ip } }), ctx());
const admin = (caminho: string, corpo?: unknown, metodo?: string) => requisicao(caminho, { corpo, metodo, cookie, origem: ORIGEM });

describe("pedido de orcamento (site publico)", () => {
  it("grava o pedido com os textos digitados e normaliza o e-mail", async () => {
    const res = await pedir(dadosOrcamento({ cliente_email: "  Ana@Exemplo.FR ", observacoes: "  3 malas grandes  " }), "198.51.100.10");
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const [o] = await consulta("select * from solicitacoes_orcamento where id = $1", [id]);
    expect(o.origem_id).toBeNull();
    expect(o.origem_texto).toBe("Château de Chantilly");
    expect(o.destino_id).toBe(3);
    expect(o.cliente_email).toBe("ana@exemplo.fr");
    expect(o.observacoes).toBe("3 malas grandes");
    expect(o.status).toBe("pendente");
    expect(o.data_volta).toBeNull();
  });

  it("ida e volta guarda a data de volta; so ida descarta a volta enviada", async () => {
    const ida = futuro(12, "09:00");
    const volta = futuro(14, "18:00");
    const r1 = await (await pedir(dadosOrcamento({ tipo_trajeto: "return", data_ida: ida, data_volta: volta }), "198.51.100.11")).json();
    const r2 = await (await pedir(dadosOrcamento({ tipo_trajeto: "one_way", data_ida: ida, data_volta: volta }), "198.51.100.11")).json();
    const [a] = await consulta("select data_volta from solicitacoes_orcamento where id = $1", [r1.id]);
    const [b] = await consulta("select data_volta from solicitacoes_orcamento where id = $1", [r2.id]);
    expect(a.data_volta).not.toBeNull();
    expect(b.data_volta).toBeNull();
  });

  it("recusa dados invalidos (volta ausente ou antes da ida, telefone curto)", async () => {
    const ip = "198.51.100.12";
    expect((await pedir(dadosOrcamento({ tipo_trajeto: "return" }), ip)).status).toBe(422);
    expect((await pedir(dadosOrcamento({ tipo_trajeto: "return", data_ida: futuro(12), data_volta: futuro(11) }), ip)).status).toBe(422);
    expect((await pedir(dadosOrcamento({ cliente_telefone: "123" }), ip)).status).toBe(422);
    expect((await pedir(dadosOrcamento({ origem_texto: "" }), ip)).status).toBe(422);
  });

  it("robo que preenche o campo isca recebe sucesso, mas nada e gravado", async () => {
    const antes = await consulta<{ n: number }>("select count(*)::int as n from solicitacoes_orcamento");
    const res = await pedir(dadosOrcamento({ contato_extra: "http://spam.example" }), "198.51.100.13");
    expect(res.status).toBe(201);
    const depois = await consulta<{ n: number }>("select count(*)::int as n from solicitacoes_orcamento");
    expect(depois[0].n).toBe(antes[0].n);
  });

  it("limita pedidos repetidos do mesmo IP", async () => {
    const ip = "198.51.100.14";
    for (let i = 0; i < 10; i++) expect((await pedir(dadosOrcamento(), ip)).status).toBe(201);
    expect((await pedir(dadosOrcamento(), ip)).status).toBe(429);
    // Outro IP continua podendo pedir.
    expect((await pedir(dadosOrcamento(), "198.51.100.15")).status).toBe(201);
  });
});

describe("pedidos de orcamento no painel", () => {
  it("exige sessao de administrador", async () => {
    expect((await orcamentosGET(requisicao("/api/admin/orcamentos"), ctx())).status).toBe(401);
    const res = await orcamentoPATCH(requisicao("/api/admin/orcamentos/1", { corpo: { status: "respondido" }, metodo: "PATCH", origem: ORIGEM }), ctx({ id: "1" }));
    expect(res.status).toBe(401);
  });

  it("lista com a cidade cadastrada, filtra por status e busca por texto", async () => {
    await pedir(dadosOrcamento({ cliente_nome: "Busca Especial 100%", origem_texto: "Giverny" }), "198.51.100.20");
    const todos = await (await orcamentosGET(admin("/api/admin/orcamentos"), ctx())).json();
    expect(todos.total).toBeGreaterThan(0);
    expect(todos.itens[0].destino_cadastrado).toBe("Paris (Centre)");

    const busca = await (await orcamentosGET(admin("/api/admin/orcamentos?q=Giverny"), ctx())).json();
    expect(busca.total).toBe(1);
    expect(busca.itens[0].cliente_nome).toBe("Busca Especial 100%");

    // "%" digitado na busca e literal, nao curinga.
    const curinga = await (await orcamentosGET(admin("/api/admin/orcamentos?q=%25"), ctx())).json();
    expect(curinga.total).toBe(1);

    const pagina = await (await orcamentosGET(admin("/api/admin/orcamentos?limite=2&pagina=1"), ctx())).json();
    expect(pagina.itens).toHaveLength(2);
    expect(pagina.total).toBe(todos.total);
  });

  it("marca como respondido com notas internas e some do filtro de pendentes", async () => {
    const { id } = await (await pedir(dadosOrcamento({ cliente_nome: "Para Responder" }), "198.51.100.21")).json();
    const res = await orcamentoPATCH(admin(`/api/admin/orcamentos/${id}`, { status: "respondido", notas_internas: "Enviado 180 EUR por WhatsApp" }, "PATCH"), ctx({ id: String(id) }));
    expect(res.status).toBe(200);

    const [o] = await consulta("select status, notas_internas from solicitacoes_orcamento where id = $1", [id]);
    expect(o.status).toBe("respondido");
    expect(o.notas_internas).toBe("Enviado 180 EUR por WhatsApp");

    const pendentes = await (await orcamentosGET(admin("/api/admin/orcamentos?status=pendente"), ctx())).json();
    expect(pendentes.itens.some((i: { id: number }) => i.id === id)).toBe(false);
    const respondidos = await (await orcamentosGET(admin("/api/admin/orcamentos?status=respondido"), ctx())).json();
    expect(respondidos.itens.some((i: { id: number }) => i.id === id)).toBe(true);
  });

  it("recusa status invalido e responde 404 para pedido inexistente", async () => {
    const invalido = await orcamentoPATCH(admin("/api/admin/orcamentos/1", { status: "aprovado" }, "PATCH"), ctx({ id: "1" }));
    expect(invalido.status).toBe(422);
    const inexistente = await orcamentoPATCH(admin("/api/admin/orcamentos/999999", { status: "descartado" }, "PATCH"), ctx({ id: "999999" }));
    expect(inexistente.status).toBe(404);
  });
});
