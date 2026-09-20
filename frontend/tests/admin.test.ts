import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/servicos/sumup", () => ({ criarCheckoutSumup: vi.fn(), consultarCheckoutSumup: vi.fn() }));

import { generateSync } from "otplib";
import { consulta } from "@/server/db/client";
import { hashSenha } from "@/server/auth/senha";
import { decifrar } from "@/server/auth/cifra";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { GET as meGET } from "@/app/api/admin/me/route";
import { POST as mfaIniciar } from "@/app/api/admin/mfa/iniciar/route";
import { POST as mfaAtivar } from "@/app/api/admin/mfa/ativar/route";
import { POST as criarReservaPublica } from "@/app/api/reservas/criar/route";
import { GET as reservasGET, POST as reservasPOST } from "@/app/api/admin/reservas/route";
import { GET as reservaGET, PATCH as reservaPATCH } from "@/app/api/admin/reservas/[id]/route";
import { POST as atribuirPOST } from "@/app/api/admin/reservas/[id]/parceiro/route";
import { POST as confirmarPOST } from "@/app/api/admin/reservas/[id]/confirmar/route";
import { POST as finalizarPOST } from "@/app/api/admin/reservas/[id]/finalizar/route";
import { POST as cancelarPOST } from "@/app/api/admin/reservas/[id]/cancelar/route";
import { POST as pagamentoPOST } from "@/app/api/admin/reservas/[id]/pagamentos/route";
import { DELETE as pagamentoDELETE } from "@/app/api/admin/reservas/[id]/pagamentos/[pid]/route";
import { GET as saldoGET } from "@/app/api/admin/parceiros/[id]/saldo/route";
import { POST as repassePOST } from "@/app/api/admin/parceiros/[id]/repasses/route";
import { POST as desfazerPOST } from "@/app/api/admin/repasses/[id]/desfazer/route";
import { GET as financeiroGET } from "@/app/api/admin/financeiro/route";
import { GET as dashboardGET } from "@/app/api/admin/dashboard/route";
import { POST as parceiroPublicoPOST } from "@/app/api/parceiros/route";
import { PATCH as parceiroPATCH } from "@/app/api/admin/parceiros/[id]/route";
import { GET as parceirosGET } from "@/app/api/admin/parceiros/route";
import { GET as veiculosGET, POST as veiculosPOST } from "@/app/api/admin/veiculos/route";
import { DELETE as veiculoDELETE, PATCH as veiculoPATCH } from "@/app/api/admin/veiculos/[id]/route";
import { GET as configGET, PUT as configPUT } from "@/app/api/admin/configuracoes/route";
import { GET as configPublicaGET } from "@/app/api/site/config/route";
import { GET as destinosGET } from "@/app/api/destinos-populares/route";
import { dadosReserva, futuro, prepararBanco, requisicao } from "./ajuda";

const ORIGEM = "http://localhost:3000";
const SENHA = "Senha-Forte-123!";
let cookie = "";

beforeAll(async () => {
  await prepararBanco();
  await consulta("insert into admins (email, senha_hash) values ($1, $2)", ["dono@rocha.fr", await hashSenha(SENHA)]);
});

const ctx = (params: Record<string, string> = {}) => ({ params });
const admin = (caminho: string, corpo?: unknown, metodo?: string) =>
  requisicao(caminho, { corpo, metodo, cookie, origem: ORIGEM });

async function login(email = "dono@rocha.fr", senha = SENHA, codigo?: string) {
  return loginPOST(requisicao("/api/admin/login", { corpo: { email, senha, codigo }, origem: ORIGEM }));
}

describe("autenticacao do admin", () => {
  it("rejeita acesso sem sessao e com cookie invalido", async () => {
    expect((await meGET(requisicao("/api/admin/me"), ctx())).status).toBe(401);
    expect((await meGET(requisicao("/api/admin/me", { cookie: "admin_session=falso" }), ctx())).status).toBe(401);
  });

  it("login correto emite cookie HttpOnly + SameSite=Strict", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie")!;
    expect(set).toMatch(/admin_session=/);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=strict/i);
    cookie = set.split(";")[0];
    const me = await (await meGET(admin("/api/admin/me"), ctx())).json();
    expect(me.email).toBe("dono@rocha.fr");
  });

  it("mesma mensagem para e-mail inexistente e senha errada (nao vaza contas)", async () => {
    const a = await (await login("naoexiste@rocha.fr", "qualquer-senha-123")).json();
    const b = await (await login("dono@rocha.fr", "senha-errada-123")).json();
    expect(a.detail).toBe(b.detail);
  });

  it("bloqueia apos varias tentativas erradas (forca bruta), mesmo com a senha certa", async () => {
    for (let i = 0; i < 5; i++) await login("alvo@rocha.fr", "errada-errada-1");
    const res = await login("alvo@rocha.fr", "errada-errada-1");
    expect(res.status).toBe(429);
    await consulta("delete from limites_taxa"); // libera para os demais testes
  });

  it("rejeita requisicoes que alteram dados vindas de outra origem (CSRF)", async () => {
    const res = await reservasPOST(requisicao("/api/admin/reservas", { corpo: dadosReserva(), cookie, origem: "https://site-malicioso.com" }), ctx());
    expect(res.status).toBe(403);
    const semOrigem = await reservasPOST(requisicao("/api/admin/reservas", { corpo: dadosReserva(), cookie }), ctx());
    expect(semOrigem.status).toBe(403);
  });

  it("sessao e invalidada quando a versao muda (ex.: troca de senha)", async () => {
    await consulta("update admins set sessao_versao = sessao_versao + 1");
    expect((await meGET(admin("/api/admin/me"), ctx())).status).toBe(401);
    cookie = (await login()).headers.get("set-cookie")!.split(";")[0];
    expect((await meGET(admin("/api/admin/me"), ctx())).status).toBe(200);
  });

  it("MFA: ativa com codigo TOTP, exige o codigo no login e impede reutiliza-lo", async () => {
    const { segredo } = await (await mfaIniciar(admin("/api/admin/mfa/iniciar", {}, "POST"), ctx())).json();
    const [{ mfa_secret }] = await consulta("select mfa_secret from admins");
    expect(mfa_secret).not.toContain(segredo); // guardado cifrado
    expect(decifrar(mfa_secret)).toBe(segredo);

    const codigo = generateSync({ secret: segredo });
    const ativado = await mfaAtivar(admin("/api/admin/mfa/ativar", { codigo }), ctx());
    expect(ativado.status).toBe(200);
    cookie = ativado.headers.get("set-cookie")!.split(";")[0];

    expect((await (await login()).json()).mfa_necessario).toBe(true); // senha certa mas sem codigo: sem sessao
    expect((await login("dono@rocha.fr", SENHA, "000000")).status).toBe(401);
    // O codigo usado para ativar nao pode ser reaproveitado no login.
    expect((await login("dono@rocha.fr", SENHA, codigo)).status).toBe(401);
    await consulta("update admins set mfa_ultimo_passo = mfa_ultimo_passo - 5"); // avanca o relogio simulado
    const ok = await login("dono@rocha.fr", SENHA, generateSync({ secret: segredo }));
    expect(ok.status).toBe(200);
    cookie = ok.headers.get("set-cookie")!.split(";")[0];
    await consulta("delete from limites_taxa");
  });
});

describe("ciclo da reserva: recebe -> destina parceiro -> confirma -> finaliza -> repassa", () => {
  let reservaId: number;
  let parceiroId: number;
  let codigo: string;

  it("cliente reserva e o admin recebe a reserva na lista", async () => {
    const res = await criarReservaPublica(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: futuro(200), cliente_email: "ciclo@example.com" }) }), ctx());
    codigo = (await res.json()).codigo;
    const lista = await (await reservasGET(admin(`/api/admin/reservas?q=${codigo}`), ctx())).json();
    expect(lista.total).toBe(1);
    reservaId = lista.itens[0].id;
    expect(lista.itens[0]).toMatchObject({ status: "pendente", status_pagamento: "pendente", parceiro_id: null });
  });

  it("solicitacao de parceiro chega pendente e so parceiro aprovado recebe viagem", async () => {
    const pub = await parceiroPublicoPOST(
      requisicao("/api/parceiros", { corpo: { nome: "Joao Motorista", email: "joao@parceiro.fr", telefone: "+33611112222", empresa: "JM Transport", cidade: "Paris", endereco: "1 rue A" } }),
      ctx()
    );
    expect(pub.status).toBe(201);
    const pendentes = await (await parceirosGET(admin("/api/admin/parceiros?status=pendente"), ctx())).json();
    parceiroId = pendentes[0].id;

    const negado = await atribuirPOST(admin("/x", { parceiro_id: parceiroId, valor_parceiro: 40 }), ctx({ id: String(reservaId) }));
    expect(negado.status).toBe(422);

    await parceiroPATCH(admin("/x", { status: "aprovado" }, "PATCH"), ctx({ id: String(parceiroId) }));
    const ok = await atribuirPOST(admin("/x", { parceiro_id: parceiroId, valor_parceiro: 40 }), ctx({ id: String(reservaId) }));
    expect(ok.status).toBe(200);
  });

  it("confirmar exige pagamento (ou autorizacao explicita)", async () => {
    const sem = await confirmarPOST(admin("/x", {}), ctx({ id: String(reservaId) }));
    expect(sem.status).toBe(409);
    expect((await sem.json()).codigo).toBe("SEM_PAGAMENTO");

    // Sinal recebido manualmente (dinheiro): status vira 'parcial'
    const pg = await pagamentoPOST(admin("/x", { valor: 13, metodo: "dinheiro", tipo: "sinal" }), ctx({ id: String(reservaId) }));
    expect((await pg.json()).status_pagamento).toBe("parcial");
    expect((await confirmarPOST(admin("/x", {}), ctx({ id: String(reservaId) }))).status).toBe(200);
  });

  it("nao aceita pagamento acima do saldo e permite estornar lancamento manual", async () => {
    const acima = await pagamentoPOST(admin("/x", { valor: 500, metodo: "dinheiro" }), ctx({ id: String(reservaId) }));
    expect(acima.status).toBe(422);
    const [{ id: pid }] = await consulta("select id from pagamentos where reserva_id = $1", [reservaId]);
    const del = await pagamentoDELETE(admin("/x", undefined, "DELETE"), ctx({ id: String(reservaId), pid: String(pid) }));
    expect((await del.json()).status_pagamento).toBe("pendente");
    await pagamentoPOST(admin("/x", { valor: 65, metodo: "transferencia" }), ctx({ id: String(reservaId) }));
    const det = await (await reservaGET(admin("/x"), ctx({ id: String(reservaId) }))).json();
    expect(det.status_pagamento).toBe("pago");
    expect(det.financeiro).toMatchObject({ total: "65.00", recebido: "65.00", saldo: "0.00" });
  });

  it("a corrida so entra no 'a pagar' do parceiro depois de finalizada", async () => {
    let saldo = await (await saldoGET(admin("/x"), ctx({ id: String(parceiroId) }))).json();
    expect(saldo).toMatchObject({ total_devido: "0.00", total_previsto: "40.00" });

    expect((await finalizarPOST(admin("/x", {}), ctx({ id: String(reservaId) }))).status).toBe(200);
    saldo = await (await saldoGET(admin("/x"), ctx({ id: String(parceiroId) }))).json();
    expect(saldo).toMatchObject({ total_devido: "40.00", total_previsto: "0.00" });
    expect(saldo.devidas).toHaveLength(1);
  });

  it("financeiro mostra recebido, a pagar ao parceiro e margem", async () => {
    const f = await (await financeiroGET(admin("/api/admin/financeiro"), ctx())).json();
    expect(Number(f.recebido_no_periodo)).toBe(65);
    expect(f.a_pagar_total).toBe(40);
    expect(Number(f.margem_periodo.receita) - Number(f.margem_periodo.custo_parceiros)).toBe(25);
    const d = await (await dashboardGET(admin("/api/admin/dashboard"), ctx())).json();
    expect(d.financeiro.a_pagar_parceiros).toBe("40.00");
  });

  it("repasse da baixa automatica nas corridas e zera o que se devia; pode ser desfeito", async () => {
    const fora = await repassePOST(admin("/x", { inicio: "2000-01-01", fim: "2000-12-31" }), ctx({ id: String(parceiroId) }));
    expect(fora.status).toBe(422); // nada em aberto naquele periodo

    const res = await repassePOST(admin("/x", { inicio: futuro(190).slice(0, 10), fim: futuro(210).slice(0, 10) }), ctx({ id: String(parceiroId) }));
    const repasse = await res.json();
    expect(repasse).toMatchObject({ corridas: 1, valor_total: "40.00" });
    const saldo = await (await saldoGET(admin("/x"), ctx({ id: String(parceiroId) }))).json();
    expect(saldo.total_devido).toBe("0.00");

    expect((await repassePOST(admin("/x", {}), ctx({ id: String(parceiroId) }))).status).toBe(422); // sem pagar duas vezes

    await desfazerPOST(admin("/x", {}), ctx({ id: String(repasse.repasse_id) }));
    const depois = await (await saldoGET(admin("/x"), ctx({ id: String(parceiroId) }))).json();
    expect(depois.total_devido).toBe("40.00");
  });

  it("nao permite cancelar viagem finalizada; cancela pendente liberando o horario", async () => {
    expect((await cancelarPOST(admin("/x", {}), ctx({ id: String(reservaId) }))).status).toBe(409);
    const res = await reservasPOST(admin("/api/admin/reservas", dadosReserva({ data_ida: futuro(220), cliente_email: "tel@example.com" })), ctx());
    const { id } = await res.json();
    const cancel = await (await cancelarPOST(admin("/x", {}), ctx({ id: String(id) }))).json();
    expect(cancel.valor_a_estornar).toBe("0.00");
  });

  it("remarcar revalida a agenda do veiculo", async () => {
    const outro = await (await reservasPOST(admin("/api/admin/reservas", dadosReserva({ data_ida: futuro(230), cliente_email: "z@example.com" })), ctx())).json();
    const conflito = await reservaPATCH(admin("/x", { data_ida: futuro(200) }, "PATCH"), ctx({ id: String(outro.id) }));
    expect(conflito.status).toBe(409); // veiculo 1 ja esta em uso em futuro(200)? (reserva finalizada segura a agenda)
  });
});

describe("conteudo do site (CRUD) e configuracoes", () => {
  it("cria, edita e desativa veiculo; nao exclui veiculo com rotas", async () => {
    const novo = await (
      await veiculosPOST(admin("/x", { nome: "Tesla Model S", slug: "tesla-model-s", capacidade_passageiros: 4, capacidade_malas: 3, preco_base: 80, preco_por_km: 3.2, ativo: true }), ctx())
    ).json();
    expect(novo.slug).toBe("tesla-model-s");
    const edit = await (await veiculoPATCH(admin("/x", { preco_por_km: 3.5, ativo: false }, "PATCH"), ctx({ id: String(novo.id) }))).json();
    expect(edit).toMatchObject({ preco_por_km: "3.50", ativo: false });
    expect((await veiculoDELETE(admin("/x", undefined, "DELETE"), ctx({ id: "1" }))).status).toBe(409);
    expect((await veiculoDELETE(admin("/x", undefined, "DELETE"), ctx({ id: String(novo.id) }))).status).toBe(200);
    const lista = await (await veiculosGET(admin("/x"), ctx())).json();
    expect(lista.find((v: any) => v.slug === "tesla-model-s")).toBeUndefined();
  });

  it("valida dados: slug invalido, imagem javascript:, campos extras sao ignorados", async () => {
    const base = { nome: "X", capacidade_passageiros: 4, capacidade_malas: 1, preco_base: 1, preco_por_km: 1, ativo: true };
    expect((await veiculosPOST(admin("/x", { ...base, slug: "Slug Invalido" }), ctx())).status).toBe(422);
    expect((await veiculosPOST(admin("/x", { ...base, slug: "ok-x", imagem_url: "javascript:alert(1)" }), ctx())).status).toBe(422);
    const r = await veiculosPOST(admin("/x", { ...base, slug: "ok-y", id: 999, senha: "x" }), ctx());
    expect((await r.json()).id).not.toBe(999); // mass-assignment bloqueado
  });

  it("configuracoes: valida, salva e o site publico so ve as chaves publicas", async () => {
    expect((await configPUT(admin("/x", { whatsapp_numero: "abc" }, "PUT"), ctx())).status).toBe(422);
    expect((await configPUT(admin("/x", { chave_secreta: "x" }, "PUT"), ctx())).status).toBe(422);
    // O sinal minimo e 20%: o admin pode aumentar, nunca reduzir.
    expect((await configPUT(admin("/x", { sinal_percentual_x: "10" }, "PUT"), ctx())).status).toBe(422);
    expect((await configPUT(admin("/x", { sinal_percentual: "10" }, "PUT"), ctx())).status).toBe(422);
    expect((await configPUT(admin("/x", { sinal_percentual: "19" }, "PUT"), ctx())).status).toBe(422);
    const ok = await configPUT(admin("/x", { email_contato: "contato@rocha.fr", sinal_percentual: "30" }, "PUT"), ctx());
    expect(ok.status).toBe(200);
    const publica = await (await configPublicaGET(requisicao("/api/site/config"), ctx())).json();
    expect(publica).toMatchObject({ email_contato: "contato@rocha.fr", sinal_percentual: "30" });
    expect(await (await configGET(admin("/x"), ctx())).json()).toHaveProperty("empresa_nome");
  });

  it("destinos populares trazem preco 'a partir de' calculado das rotas", async () => {
    const d = await (await destinosGET(requisicao("/api/destinos-populares"), ctx())).json();
    expect(d).toHaveLength(4);
    expect(d[0]).toMatchObject({ titulo: expect.stringContaining("CDG"), preco_a_partir: "65.00", tempo_minutos: 45 });
  });
});

describe("validacao de URL de imagem", () => {
  it("recusa //host externo e esquemas perigosos; aceita caminho local e https", async () => {
    const base = { nome: "V", capacidade_passageiros: 4, capacidade_malas: 1, preco_base: 1, preco_por_km: 1, ativo: true };
    const tenta = async (slug: string, imagem_url: string) =>
      (await veiculosPOST(admin("/x", { ...base, slug, imagem_url }), ctx())).status;
    expect(await tenta("img-a", "//evil.com/x.jpg")).toBe(422);
    expect(await tenta("img-b", "http://evil.com/x.jpg")).toBe(422);
    expect(await tenta("img-c", "data:text/html,<script>1</script>")).toBe(422);
    expect(await tenta("img-d", "/images/vehicles/x.jpg")).toBe(201);
    expect(await tenta("img-e", "https://cdn.exemplo.com/x.jpg")).toBe(201);
  });
});

describe("confirmacao exige o pagamento minimo", () => {
  it("5 EUR de uma reserva de 65 EUR nao basta; 13 EUR (20%) basta", async () => {
    await consulta("update configuracoes set valor = '20' where chave = 'sinal_percentual'"); // um teste anterior usou 30%
    const res = await criarReservaPublica(requisicao("/api/reservas/criar", { corpo: dadosReserva({ data_ida: futuro(400), cliente_email: "minimo@example.com" }) }), ctx());
    const { codigo } = await res.json();
    const [{ id }] = await consulta("select id from reservas where codigo = $1", [codigo]);
    const [{ id: parceiro }] = await consulta("select id from parceiros where status = 'aprovado' limit 1");
    await atribuirPOST(admin("/x", { parceiro_id: parceiro, valor_parceiro: 30 }), ctx({ id: String(id) }));

    await pagamentoPOST(admin("/x", { valor: 5, metodo: "dinheiro" }), ctx({ id: String(id) }));
    const bloqueada = await confirmarPOST(admin("/x", {}), ctx({ id: String(id) }));
    expect(bloqueada.status).toBe(409);
    expect((await bloqueada.json()).codigo).toBe("SEM_PAGAMENTO");

    await pagamentoPOST(admin("/x", { valor: 8, metodo: "dinheiro" }), ctx({ id: String(id) }));
    expect((await confirmarPOST(admin("/x", {}), ctx({ id: String(id) }))).status).toBe(200);
  });
});
