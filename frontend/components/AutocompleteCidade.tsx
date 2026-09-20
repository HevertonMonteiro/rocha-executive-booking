"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface Cidade {
  id: number;
  nome: string;
  codigo_iata: string | null;
  regiao: string;
  tipo?: string;
}

interface Props {
  label: string;
  placeholder?: string;
  icon?: "origin" | "destination";
  onSelect: (cidade: Cidade | null) => void;
}

export default function AutocompleteCidade({
  label,
  placeholder = "Digite o aeroporto, cidade ou estação...",
  icon = "origin",
  onSelect,
}: Props) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Cidade[]>([]);
  const [aberto, setAberto] = useState(false);
  const [selecionada, setSelecionada] = useState<Cidade | null>(null);
  const [carregando, setCarregando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (selecionada) return;
    if (termo.trim().length < 2) {
      setResultados([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get<Cidade[]>("/api/cidades", { params: { q: termo } });
        setResultados(data);
        setAberto(true);
      } catch {
        setResultados([]);
      } finally {
        setCarregando(false);
      }
    }, 250); // debounce

    return () => clearTimeout(timer.current);
  }, [termo, selecionada]);

  function escolher(cidade: Cidade) {
    setSelecionada(cidade);
    setTermo(cidade.nome);
    setAberto(false);
    onSelect(cidade);
  }

  function aoDigitar(valor: string) {
    setTermo(valor);
    if (selecionada) {
      setSelecionada(null);
      onSelect(null);
    }
  }

  function limpar() {
    setTermo("");
    setSelecionada(null);
    onSelect(null);
    setResultados([]);
  }

  return (
    <div className="relative w-full">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${icon === "origin" ? "bg-brand-500" : "bg-gold-500"}`}></span>
        {label}
      </label>

      <div className="relative flex items-center">
        {/* Left Icon */}
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          {icon === "origin" ? (
            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          )}
        </div>

        <input
          type="text"
          value={termo}
          onChange={(e) => aoDigitar(e.target.value)}
          onFocus={() => resultados.length > 0 && setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 220)}
          placeholder={placeholder}
          className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium text-sm pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition shadow-inner"
        />

        {/* Clear or loading indicator */}
        <div className="absolute right-3 flex items-center">
          {carregando ? (
            <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : termo ? (
            <button
              type="button"
              onClick={limpar}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Results Dropdown */}
      {aberto && resultados.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <li className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Locais encontrados ({resultados.length})
          </li>
          {resultados.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => escolher(c)}
              className="cursor-pointer px-3.5 py-2.5 rounded-lg hover:bg-brand-50 flex items-center justify-between text-slate-800 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center text-slate-500 group-hover:text-brand-600 transition">
                  {c.codigo_iata || c.tipo === "aeroporto" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  ) : c.tipo === "estacao" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 4h8m-4 4h4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                    {c.nome}
                  </div>
                  <div className="text-xs text-slate-400 capitalize">
                    {c.regiao.replace(/-/g, " ")}
                  </div>
                </div>
              </div>

              {c.codigo_iata && (
                <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-mono font-bold text-xs">
                  {c.codigo_iata}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
