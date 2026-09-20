import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { requisicaoLocal } from "./lib/acessoLocal";

function acessoAdminLocal(): boolean {
  const v = process.env.ADMIN_ACESSO;
  return v === "local" || (v !== "qualquer" && process.env.NODE_ENV !== "production");
}

// 1) Modo "local": o painel (paginas e API) nao existe para quem vem de link publico/tunel.
// 2) Protege as PAGINAS do painel exigindo sessao valida (a API valida de novo a cada chamada,
//    inclusive no banco). Roda no edge: nao pode importar codigo do servidor Node.
export async function middleware(req: NextRequest) {
  if (acessoAdminLocal() && !requisicaoLocal(req.headers)) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") || pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get("admin_session")?.value;
  const segredo = process.env.JWT_SECRET;
  if (token && segredo) {
    try {
      await jwtVerify(token, new TextEncoder().encode(segredo), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {
      /* token invalido ou expirado por inatividade */
    }
  }
  return NextResponse.redirect(new URL("/admin/login?motivo=expirada", req.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
