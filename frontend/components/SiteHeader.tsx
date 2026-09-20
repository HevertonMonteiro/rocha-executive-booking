"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HeaderControls from "@/components/HeaderControls";
import { usePreferences } from "@/lib/PreferencesContext";

export default function SiteHeader() {
  const { t } = usePreferences();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;
    function fecharComEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAberto(false);
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [menuAberto]);

  const fechar = () => setMenuAberto(false);

  const links = [
    { href: "/#destinos", label: t("destinations") },
    { href: "/#beneficios", label: t("advantages") },
    { href: "/#faq", label: t("navFaq") },
    { href: "/parceiro", label: t("navPartner") },
  ];

  return (
    <>
      {/* Top Info Bar: Benefícios à esquerda | WhatsApp + Moeda + Idioma à direita */}
      <div className="bg-navy-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <strong className="text-white">{t("fixedPrice")}</strong>
              <span className="hidden sm:inline">· {t("noHiddenFees")}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {t("freeCancel")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              rel="nofollow"
              title={t("navAdmin")}
              aria-label={t("navAdmin")}
              className="flex items-center gap-1.5 text-slate-300 hover:text-gold-400 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="hidden sm:inline">{t("navAdmin")}</span>
            </Link>
            <span className="text-slate-700">|</span>
            <HeaderControls />
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur-md border-b border-navy-800 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" onClick={fechar} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-extrabold text-navy-950 shadow-md group-hover:scale-105 transition">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider uppercase font-heading text-white">
                Rocha <span className="text-gold-400 font-medium">Executive</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 -mt-1 font-semibold">
                Private Chauffeur France
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gold-400 transition">
                  {link.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/#reservar"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-xs tracking-wide uppercase transition shadow-md hover:shadow-gold-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t("bookTransfer")}
            </Link>

            <button
              type="button"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-label={t("menuToggle")}
              aria-expanded={menuAberto}
              aria-controls="menu-mobile"
              className="md:hidden w-10 h-10 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center text-slate-200 hover:text-gold-400 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuAberto ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuAberto && (
          <nav id="menu-mobile" className="md:hidden border-t border-navy-800 bg-navy-900 px-4 py-3">
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={fechar}
                    className="block py-3 text-sm font-semibold text-slate-200 hover:text-gold-400 border-b border-navy-800 transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/#reservar"
              onClick={fechar}
              className="mt-4 flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-950 font-bold text-xs tracking-wide uppercase"
            >
              {t("bookTransfer")}
            </Link>
            <Link
              href="/admin"
              onClick={fechar}
              rel="nofollow"
              className="mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-navy-700 bg-navy-800 text-slate-200 hover:text-gold-400 font-semibold text-xs transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t("navAdmin")}
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
