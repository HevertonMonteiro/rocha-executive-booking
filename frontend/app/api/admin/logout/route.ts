import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, opcoesCookie } from "@/server/auth/sessao";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  // Sempre limpa o cookie (mesmo sem sessao valida): sair nunca deve falhar.
  const resposta = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  resposta.cookies.set(COOKIE_SESSAO, "", { ...opcoesCookie(0), maxAge: 0 });
  return resposta;
}
