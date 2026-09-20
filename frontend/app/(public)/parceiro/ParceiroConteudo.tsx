"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";

const CAMPO =
  "w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition";

const VAZIO = { nome: "", email: "", telefone: "", empresa: "", cidade: "", endereco: "", site: "", contato_extra: "" };

export default function ParceiroConteudo() {
  const { t } = usePreferences();
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  function atualizar(campo: keyof typeof VAZIO, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await api.post("/api/parceiros", { ...form, site: form.site || null });
      setEnviado(true);
      setForm(VAZIO);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setErro(status === 409 ? t("partnerErrorDuplicate") : t("partnerErrorGeneric"));
    } finally {
      setEnviando(false);
    }
  }

  const beneficios = [1, 2, 3];
  const etapas = [1, 2, 3];

  return (
    <div className="w-full bg-slate-50">
      <section className="bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white py-16 px-4 sm:px-6 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl sm:text-5xl font-extrabold tracking-tight font-heading">
          {t("partnerTitle")}
        </h1>
        <p className="mx-auto max-w-2xl mt-4 text-base sm:text-lg text-slate-300">{t("partnerSub")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {beneficios.map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900">{t(`partnerBenefit${n}Title`)}</h2>
              <p className="text-sm text-slate-500 mt-2">{t(`partnerBenefit${n}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-bold font-heading text-slate-900 mb-6">{t("partnerStepsTitle")}</h2>
          <ol className="space-y-5">
            {etapas.map((n) => (
              <li key={n} className="flex gap-4">
                <span className="w-9 h-9 rounded-full bg-navy-950 text-gold-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {n}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{t(`partnerStep${n}Title`)}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t(`partnerStep${n}Desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div id="cadastro" className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 scroll-mt-24">
          {enviado ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t("partnerSuccessTitle")}</h2>
              <p className="text-sm text-slate-500 mb-6">{t("partnerSuccessDesc")}</p>
              <Link href="/" className="text-sm font-bold text-brand-600 hover:underline">
                {t("partnerBack")}
              </Link>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading">{t("partnerFormTitle")}</h2>

              <div>
                <label htmlFor="p-nome" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t("partnerName")}
                </label>
                <input id="p-nome" required minLength={2} maxLength={100} autoComplete="name" value={form.nome}
                  onChange={(e) => atualizar("nome", e.target.value)} className={CAMPO} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t("partnerEmail")}
                  </label>
                  <input id="p-email" type="email" required autoComplete="email" value={form.email}
                    onChange={(e) => atualizar("email", e.target.value)} className={CAMPO} />
                </div>
                <div>
                  <label htmlFor="p-tel" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t("partnerPhone")}
                  </label>
                  <input id="p-tel" type="tel" required minLength={8} maxLength={20} autoComplete="tel" value={form.telefone}
                    onChange={(e) => atualizar("telefone", e.target.value)} className={CAMPO} />
                </div>
              </div>

              <div>
                <label htmlFor="p-empresa" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t("partnerCompany")}
                </label>
                <input id="p-empresa" required minLength={2} maxLength={150} autoComplete="organization" value={form.empresa}
                  onChange={(e) => atualizar("empresa", e.target.value)} className={CAMPO} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-cidade" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t("partnerCity")}
                  </label>
                  <input id="p-cidade" required minLength={2} maxLength={100} autoComplete="address-level2" value={form.cidade}
                    onChange={(e) => atualizar("cidade", e.target.value)} className={CAMPO} />
                </div>
                <div>
                  <label htmlFor="p-end" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {t("partnerAddress")}
                  </label>
                  <input id="p-end" required minLength={3} maxLength={200} autoComplete="street-address" value={form.endereco}
                    onChange={(e) => atualizar("endereco", e.target.value)} className={CAMPO} />
                </div>
              </div>

              <div>
                <label htmlFor="p-site" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {t("partnerWebsite")} <span className="normal-case font-medium text-slate-400">({t("partnerOptional")})</span>
                </label>
                <input id="p-site" type="url" maxLength={200} placeholder="https://" autoComplete="url" value={form.site}
                  onChange={(e) => atualizar("site", e.target.value)} className={CAMPO} />
              </div>

              {/* Campo isca anti-robo: invisivel e fora da navegacao por teclado */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <input tabIndex={-1} autoComplete="off" name="contato_extra" value={form.contato_extra}
                  onChange={(e) => atualizar("contato_extra", e.target.value)} />
              </div>

              {erro && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 hover:from-gold-300 hover:to-gold-500 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? t("partnerSending") : t("partnerSubmit")}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
