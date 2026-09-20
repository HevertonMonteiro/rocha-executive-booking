import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { consulta } from "@/server/db/client";
import { hashSenha } from "@/server/auth/senha";
import { COOKIE_SESSAO, agoraSegundos, assinarSessao } from "@/server/auth/sessao";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { GET as meGET } from "@/app/api/admin/me/route";
import { GET as reservasGET } from "@/app/api/admin/reservas/route";
import { prepararBanco, requisicao } from "./ajuda";

const ORIGEM = "http://localhost:3000";
const SENHA = "Senha-Forte-123!";
const ctx = { params: {} };
let adminId = 0;
const cookieDe = (token: string) => `${COOKIE_SESSAO}=${token}`;

beforeAll(async () => {
  await prepararBanco();
  const [a] = await consulta("insert into admins (email, senha_hash) values ($1, $2) returning id", ["sessao@rocha.fr", await hashSenha(SENHA)]);
  adminId = a.id;
});

async function tokenExpirado(segundosAtras: number) {
  // Token assinado com a chave real, porem ja vencido (simula 30+ min sem usar o painel).
  return new SignJWT({ mfa: false, v: 0, ini: agoraSegundos() - segundosAtras })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt(agoraSegundos() - segundosAtras)
    .setExpirationTime(agoraSegundos() - 60)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
}

describe("painel so responde ao proprio computador (modo local)", () => {
  it("acesso direto local funciona", async () => {
    const res = await loginPOST(requisicao("/api/admin/login", { corpo: { email: "sessao@rocha.fr", senha: SENHA }, origem: ORIGEM }));
    expect(res.status).toBe(200);
  });

  it("quem entra por link publico/tunel recebe 404 no login e na API, mesmo com cookie valido", async () => {
    const ok = await loginPOST(requisicao("/api/admin/login", { corpo: { email: "sessao@rocha.fr", senha: SENHA }, origem: ORIGEM }));
    const cookie = ok.headers.get("set-cookie")!.split(";")[0];

    const externos: Record<string, string>[] = [
      { host: "abc-def.trycloudflare.com" }, // dominio do tunel
      { "x-forwarded-for": "203.0.113.9" }, // chegou por proxy, mesmo com Host localhost
      { "cf-connecting-ip": "203.0.113.9" },
      { "x-forwarded-host": "abc.trycloudflare.com" },
    ];
    for (const headers of externos) {
      const login = await loginPOST(requisicao("/api/admin/login", { corpo: { email: "sessao@rocha.fr", senha: SENHA }, origem: ORIGEM, headers }));
      expect(login.status, JSON.stringify(headers)).toBe(404);
      const me = await meGET(requisicao("/api/admin/me", { cookie, headers }), ctx);
      expect(me.status, JSON.stringify(headers)).toBe(404);
      const lista = await reservasGET(requisicao("/api/admin/reservas", { cookie, headers }), ctx);
      expect(lista.status, JSON.stringify(headers)).toBe(404);
    }
    // O proprio Next em desenvolvimento acrescenta loopback: continua sendo acesso local.
    const nextInterno = { "x-forwarded-for": "::1", "x-forwarded-host": "localhost:3000" };
    expect((await meGET(requisicao("/api/admin/me", { cookie, headers: nextInterno }), ctx)).status).toBe(200);
    // Tentativa de enganar o filtro com loopback falso: o IP real do visitante vem junto e bloqueia.
    const forjado = { "x-forwarded-for": "127.0.0.1, 203.0.113.9" };
    expect((await meGET(requisicao("/api/admin/me", { cookie, headers: forjado }), ctx)).status).toBe(404);
    // e o mesmo cookie continua valido no computador local
    expect((await meGET(requisicao("/api/admin/me", { cookie }), ctx)).status).toBe(200);
  });
});

describe("desconexao por inatividade (30 min) com teto absoluto", () => {
  it("cada uso renova o cookie por mais 30 minutos (sessao deslizante)", async () => {
    const ok = await loginPOST(requisicao("/api/admin/login", { corpo: { email: "sessao@rocha.fr", senha: SENHA }, origem: ORIGEM }));
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/Max-Age=1800/); // 30 minutos
    const me = await meGET(requisicao("/api/admin/me", { cookie: setCookie.split(";")[0] }), ctx);
    expect(me.status).toBe(200);
    const renovado = me.headers.get("set-cookie")!;
    expect(renovado).toMatch(new RegExp(`${COOKIE_SESSAO}=`));
    expect(renovado).toMatch(/Max-Age=1800/);
    expect(renovado).toMatch(/HttpOnly/i);
    expect(renovado).toMatch(/SameSite=strict/i);
  });

  it("sessao sem uso por mais de 30 minutos (token vencido) e recusada", async () => {
    const res = await meGET(requisicao("/api/admin/me", { cookie: cookieDe(await tokenExpirado(31 * 60)) }), ctx);
    expect(res.status).toBe(401);
  });

  it("mesmo com uso continuo, apos o teto de 8 horas precisa entrar de novo", async () => {
    const velho = await assinarSessao(adminId, false, 0, agoraSegundos() - 9 * 3600); // token novo, mas sessao iniciada ha 9 h
    const res = await meGET(requisicao("/api/admin/me", { cookie: cookieDe(velho) }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).codigo).toBe("SESSAO_EXPIRADA");
  });

  it("a renovacao preserva o inicio: nao da para estender a sessao alem do teto", async () => {
    const inicio = agoraSegundos() - 3600;
    const token = await assinarSessao(adminId, false, 0, inicio);
    const me = await meGET(requisicao("/api/admin/me", { cookie: cookieDe(token) }), ctx);
    const novo = me.headers.get("set-cookie")!.split(";")[0].split("=")[1];
    const payload = JSON.parse(Buffer.from(novo.split(".")[1], "base64url").toString());
    expect(payload.ini).toBe(inicio);
  });
});
