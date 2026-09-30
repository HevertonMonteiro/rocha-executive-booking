"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";

export interface DadosOrcamento {
  origem_id: number | null;
  origem_texto: string;
  destino_id: number | null;
  destino_texto: string;
  tipo_trajeto: "one_way" | "return";
  data_ida: string;
  data_volta: string | null;
  quantidade_passageiros: number;
}

const inputCls =
  "w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition";

export default function OrcamentoModal({ dados, onFechar }: { dados: DadosOrcamento; onFechar: () => void }) {
  const { t } = usePreferences();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [contatoExtra, setContatoExtra] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await api.post("/api/orcamentos", {
        ...dados,
        cliente_nome: nome,
        cliente_telefone: telefone,
        cliente_email: email || null,
        observacoes: observacoes || null,
        contato_extra: contatoExtra || null,
      });
      setEnviado(true);
    } catch (err: any) {
      setErro(err?.response?.data?.detail || "Nao foi possivel enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onMouseDown={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-7"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label={t("close")}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
        >
          ✕
        </button>

        {enviado ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{t("quoteSuccessTitle")}</h3>
            <p className="text-sm text-slate-500 mt-2">{t("quoteSuccessMsg")}</p>
            <button
              type="button"
              onClick={onFechar}
              className="mt-6 inline-flex items-center justify-center font-bold text-sm text-navy-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 px-5 py-2.5 rounded-xl transition"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900 pr-6">{t("quoteModalTitle")}</h3>
            <p className="text-xs text-slate-500 mt-1.5 mb-5">{t("quoteModalIntro")}</p>

            <form onSubmit={enviar} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">{t("fullName")}</label>
                <input required minLength={2} maxLength={100} className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">{t("phone")}</label>
                <input required minLength={8} maxLength={20} className={inputCls} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">{t("emailOptional")}</label>
                <input type="email" maxLength={100} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">{t("specialRequests")}</label>
                <textarea rows={3} maxLength={2000} className={inputCls} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>

              {/* Campo isca anti-robo: invisivel e fora da navegacao por teclado */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <input tabIndex={-1} autoComplete="off" name="contato_extra" value={contatoExtra} onChange={(e) => setContatoExtra(e.target.value)} />
              </div>

              {erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 hover:from-gold-300 hover:to-gold-500 transition disabled:opacity-50"
              >
                {enviando ? t("quoteSending") : t("quoteSubmit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
