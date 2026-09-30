"use client";

import { useEffect, useRef, useState } from "react";
import {
  IDIOMAS_DISPONIVEIS,
  MOEDAS_DISPONIVEIS,
  usePreferences,
} from "@/lib/PreferencesContext";
export default function HeaderControls() {
  const { moeda, setMoeda, idioma, setIdioma, t } = usePreferences();
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
