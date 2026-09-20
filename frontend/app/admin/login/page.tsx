"use client";

import { useState } from "react";
import Link from "next/link";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Campo, inputCls } from "@/components/admin/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precisaCodigo, setPrecisaCodigo] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [motivo] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("motivo") ?? ""));

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const { data } = await adminApi.post("/login", { email, senha, codigo: codigo || undefined });
      if (data.mfa_necessario) {
        setPrecisaCodigo(true);
      } else {
        window.location.href = "/admin";
      }
    } catch (err) {
      setErro(mensagemErro(err, "Nao foi possivel entrar."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-extrabold text-navy-950 text-lg shadow-md">R</div>
          <h1 className="text-lg font-black text-slate-900 font-heading mt-3">Painel administrativo</h1>
          <p className="text-xs text-slate-500">Rocha Executive Transport</p>
        </div>

        {motivo === "inatividade" && <div className="mb-4"><Alerta tipo="aviso">Sua sessão foi encerrada após 30 minutos de inatividade. Entre novamente.</Alerta></div>}
        {motivo === "expirada" && <div className="mb-4"><Alerta tipo="aviso">Sua sessão expirou. Entre novamente.</Alerta></div>}
        <form onSubmit={entrar} className="space-y-4" autoComplete="on">
          <Campo rotulo="E-mail">
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} disabled={precisaCodigo} />
          </Campo>
          <Campo rotulo="Senha">
            <input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} disabled={precisaCodigo} />
          </Campo>
          {precisaCodigo && (
            <Campo rotulo="Código do aplicativo autenticador" dica="Os 6 dígitos que aparecem no seu celular.">
              <input inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} className={`${inputCls} tracking-[0.4em] text-center font-mono`} />
            </Campo>
          )}
          {erro && <Alerta>{erro}</Alerta>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 disabled:opacity-50 transition"
          >
            {enviando ? "Entrando..." : precisaCodigo ? "Verificar e entrar" : "Entrar"}
          </button>
        </form>

        <Link href="/" className="block text-center text-xs text-slate-500 hover:text-slate-800 mt-5">← Voltar ao site</Link>
      </div>
    </div>
  );
}
