"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import { Carregando } from "./ui";

interface Eu {
  email: string;
  nome: string;
  acesso_liberado: boolean;
  mfa_obrigatorio: boolean;
  mfa_ativo: boolean;
}

const MENU: { grupo: string; itens: { href: string; rotulo: string; icone: string }[] }[] = [
  {
    grupo: "Operação",
    itens: [
      { href: "/admin", rotulo: "Painel", icone: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
      { href: "/admin/reservas", rotulo: "Reservas", icone: "M8 7V3m8 4V3M5 11h14M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" },
      { href: "/admin/clientes", rotulo: "Clientes", icone: "M17 20h5v-2a3 3 0 00-5.4-1.9M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.9M7 20H2v-2a3 3 0 015.4-1.9M7 20v-2c0-.7.1-1.3.4-1.9m0 0a5 5 0 019.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/parceiros", rotulo: "Parceiros", icone: "M12 4.3a4 4 0 110 5.4M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.2M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
      { href: "/admin/financeiro", rotulo: "Financeiro", icone: "M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8c1.1 0 2.1.4 2.6 1M12 8V7m0 1v8m0 0v1m0-1c-1.1 0-2.1-.4-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    ],
  },
  {
    grupo: "Site",
    itens: [
      { href: "/admin/frota", rotulo: "Frota", icone: "M8 17a2 2 0 11-4 0 2 2 0 014 0zm12 0a2 2 0 11-4 0 2 2 0 014 0zM3 13V7a1 1 0 011-1h9l4 4h2a1 1 0 011 1v2M3 13h1m11 0h-7" },
      { href: "/admin/rotas", rotulo: "Rotas e preços", icone: "M9 20l-5.4-2.7A1 1 0 013 16.4V5.6a1 1 0 011.5-.9L9 7m0 13l6-3m-6 3V7m6 10l4.6 2.3A1 1 0 0021 18.4V7.6a1 1 0 00-.6-.9L15 4m0 13V4m0 0L9 7" },
      { href: "/admin/destinos", rotulo: "Destinos populares", icone: "M5 3l14 9-14 9V3z" },
      { href: "/admin/cidades", rotulo: "Cidades e regiões", icone: "M17.7 16.7L13.4 21a2 2 0 01-2.8 0l-4.3-4.3a8 8 0 1111.4 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" },
      { href: "/admin/configuracoes", rotulo: "Dados da empresa", icone: "M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 001 2.6c1.8.4 1.8 3 0 3.4a1.7 1.7 0 00-1 2.6c.9 1.5-.8 3.3-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 00-2.6-1c-1.5.9-3.3-.8-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 001-2.6c-.9-1.5.8-3.3 2.4-2.4.9.5 2.1 0 2.6-1.1zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
  {
    grupo: "Conta",
    itens: [{ href: "/admin/seguranca", rotulo: "Segurança", icone: "M9 12l2 2 4-4m5.6-4A12 12 0 0112 2.9 12 12 0 013.4 6 12 12 0 003 9c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-1-.1-2-.4-3z" }],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const ehLogin = pathname === "/admin/login";

  useEffect(() => {
    if (ehLogin) return;
    adminApi
      .get<Eu>("/me")
      .then(({ data }) => {
        setEu(data);
        // MFA obrigatorio e ainda nao ativado: so a tela de seguranca fica disponivel.
        if (!data.acesso_liberado && pathname !== "/admin/seguranca") router.replace("/admin/seguranca");
      })
      .catch(() => {});
  }, [ehLogin, pathname, router]);

  useEffect(() => setMenuAberto(false), [pathname]);

  // Inatividade: sem mouse/teclado/toque por 30 minutos, sai sozinho. Quando o admin esta
  // ativo, avisa o servidor (no maximo a cada 5 min) para renovar a sessao.
  useEffect(() => {
    if (!eu) return;
    const LIMITE_MS = 30 * 60 * 1000;
    let ultimaAtividade = Date.now();
    let ultimoAviso = Date.now();
    const atividade = () => {
      ultimaAtividade = Date.now();
      if (Date.now() - ultimoAviso > 5 * 60 * 1000) {
        ultimoAviso = Date.now();
        adminApi.get("/me").catch(() => {});
      }
    };
    const eventos = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    eventos.forEach((e) => window.addEventListener(e, atividade, { passive: true }));
    const relogio = setInterval(async () => {
      if (Date.now() - ultimaAtividade >= LIMITE_MS) {
        await adminApi.post("/logout").catch(() => {});
        window.location.href = "/admin/login?motivo=inatividade";
      }
    }, 15_000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, atividade));
      clearInterval(relogio);
    };
  }, [eu]);

  if (ehLogin) return <>{children}</>;
  if (!eu) return <Carregando texto="Verificando acesso..." />;

  async function sair() {
    await adminApi.post("/logout").catch(() => {});
    window.location.href = "/admin/login";
  }

  const navegacao = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {MENU.map((g) => (
        <div key={g.grupo}>
          <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{g.grupo}</div>
          <ul className="space-y-0.5">
            {g.itens.map((i) => {
              const ativo = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
              const bloqueado = !eu.acesso_liberado && i.href !== "/admin/seguranca";
              return (
                <li key={i.href}>
                  <Link
                    href={bloqueado ? "/admin/seguranca" : i.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      ativo ? "bg-gold-500 text-navy-950" : "text-slate-300 hover:bg-navy-800 hover:text-white"
                    } ${bloqueado ? "opacity-40" : ""}`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={i.icone} />
                    </svg>
                    {i.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const rodape = (
    <div className="p-3 border-t border-navy-800">
      <div className="px-3 pb-2 text-xs text-slate-400 truncate" title={eu.email}>{eu.email}</div>
      <button type="button" onClick={sair} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-navy-800 hover:text-white transition">
        Sair
      </button>
      <Link href="/" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-gold-400 transition">← Ver o site</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-navy-950 text-white sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-navy-800">
          <div className="text-sm font-black tracking-wider uppercase font-heading">Rocha <span className="text-gold-400 font-medium">Executive</span></div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">Painel administrativo</div>
        </div>
        {navegacao}
        {rodape}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-navy-950 text-white px-4 py-3">
          <span className="text-sm font-black tracking-wider uppercase font-heading">Rocha <span className="text-gold-400 font-medium">Admin</span></span>
          <button type="button" aria-label="Abrir menu" onClick={() => setMenuAberto(true)} className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </header>

        {menuAberto && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="w-72 bg-navy-950 text-white flex flex-col">{navegacao}{rodape}</div>
            <button type="button" aria-label="Fechar menu" className="flex-1 bg-black/50" onClick={() => setMenuAberto(false)} />
          </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
