"use client";

import { useEffect, useRef, useState } from "react";
import {
  IDIOMAS_DISPONIVEIS,
  MOEDAS_DISPONIVEIS,
  usePreferences,
} from "@/lib/PreferencesContext";
import { useSiteConfig } from "@/lib/SiteConfig";


export default function HeaderControls() {
  const { moeda, setMoeda, idioma, setIdioma, t } = usePreferences();
  const { whatsappLink, whatsapp_exibicao } = useSiteConfig();
  const [menuMoedaAberto, setMenuMoedaAberto] = useState(false);
  const [menuIdiomaAberto, setMenuIdiomaAberto] = useState(false);

  const moedaRef = useRef<HTMLDivElement>(null);
  const idiomaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moedaRef.current && !moedaRef.current.contains(event.target as Node)) {
        setMenuMoedaAberto(false);
      }
      if (idiomaRef.current && !idiomaRef.current.contains(event.target as Node)) {
        setMenuIdiomaAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-3 text-xs">
      {/* WhatsApp Link no Canto Superior Direito */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 font-medium transition shadow-sm"
      >
        <svg className="w-3.5 h-3.5 fill-current text-emerald-400" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
        <span className="font-semibold text-white">{whatsapp_exibicao}</span>
      </a>

      <span className="text-slate-700">|</span>

      {/* Seletor de Moeda */}
      <div className="relative" ref={moedaRef}>
        <button
          type="button"
          onClick={() => {
            setMenuMoedaAberto(!menuMoedaAberto);
            setMenuIdiomaAberto(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-900/90 hover:bg-navy-800 text-slate-200 border border-slate-700 font-medium transition shadow-sm"
        >
          <span className="font-mono font-bold text-gold-400">{moeda.simbolo}</span>
          <span className="font-bold">{moeda.codigo}</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              menuMoedaAberto ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuMoedaAberto && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-navy-950/98 backdrop-blur-md border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Moedas Disponíveis
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Base EUR (€)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {MOEDAS_DISPONIVEIS.map((m) => (
                <button
                  key={m.codigo}
                  type="button"
                  onClick={() => {
                    setMoeda(m);
                    setMenuMoedaAberto(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition ${
                    moeda.codigo === m.codigo
                      ? "bg-gold-500 text-navy-950 font-bold shadow-md"
                      : "text-slate-300 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs opacity-80">{m.simbolo}</span>
                    <span className="text-xs">{m.codigo}</span>
                  </div>
                  <span className="text-[10px] opacity-75 truncate max-w-[80px]">
                    {m.nome}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="text-slate-700">|</span>

      {/* Seletor de Idioma */}
      <div className="relative" ref={idiomaRef}>
        <button
          type="button"
          onClick={() => {
            setMenuIdiomaAberto(!menuIdiomaAberto);
            setMenuMoedaAberto(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-900/90 hover:bg-navy-800 text-slate-200 border border-slate-700 font-medium transition shadow-sm"
        >
          <span>{idioma.bandeira}</span>
          <span className="font-bold">{idioma.codigo}</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              menuIdiomaAberto ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuIdiomaAberto && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-navy-950/98 backdrop-blur-md border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="pb-2 mb-2 border-b border-slate-800">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Selecione o Idioma
              </span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {IDIOMAS_DISPONIVEIS.map((i) => (
                <button
                  key={i.codigo}
                  type="button"
                  onClick={() => {
                    setIdioma(i);
                    setMenuIdiomaAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition ${
                    idioma.codigo === i.codigo
                      ? "bg-gold-500 text-navy-950 font-bold shadow-md"
                      : "text-slate-300 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{i.bandeira}</span>
                    <span className="text-xs">{i.nome}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">{i.codigo}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
