"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AutocompleteCidade, { Cidade } from "@/components/AutocompleteCidade";
import { usePreferences } from "@/lib/PreferencesContext";
import { linkRotaRapida } from "@/lib/rotas";
import type { DestinoPopular } from "@/lib/SiteConfig";
import { translations } from "@/lib/translations";

const FAQ_ITENS = [1, 2, 3, 4, 5, 6];

// Dados estruturados em frances (mercado alvo), independentes do idioma escolhido na tela.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITENS.map((n) => ({
    "@type": "Question",
    name: translations.fr[`faq${n}q`],
    acceptedAnswer: { "@type": "Answer", text: translations.fr[`faq${n}a`] },
  })),
};

export default function HomeConteudo({ destinos }: { destinos: DestinoPopular[] }) {
  const router = useRouter();
  const { formatarPreco, t } = usePreferences();
  const [origem, setOrigem] = useState<Cidade | null>(null);
  const [destino, setDestino] = useState<Cidade | null>(null);
  const [dataIda, setDataIda] = useState("");
  const [idaVolta, setIdaVolta] = useState(false);
  const [dataVolta, setDataVolta] = useState("");
  const [passageiros, setPassageiros] = useState(1);

  const valido = origem && destino && dataIda && (!idaVolta || dataVolta);

  function buscar() {
    if (!valido) return;
    const params = new URLSearchParams({
      origem_id: String(origem!.id),
      destino_id: String(destino!.id),
      data_ida: dataIda,
      tipo_trajeto: idaVolta ? "return" : "one_way",
      passageiros: String(passageiros),
    });
    if (idaVolta) params.set("data_volta", dataVolta);
    router.push(`/selecao?${params.toString()}`);
  }

  function explorarDestino(origemId: number, destinoId: number) {
    router.push(linkRotaRapida(origemId, destinoId));
  }

  return (
    <div className="w-full">
      {/* Hero Section com Background Executivo */}
      <section className="relative bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d_1px,transparent_1px),linear-gradient(to_bottom,#1f293d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />

        <div className="relative mx-auto max-w-5xl text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/80 border border-navy-700 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
            {t("heroBadge")}
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-heading text-white leading-tight">
            {t("heroTitle1")} <br />
            <span className="bg-gradient-to-r from-white via-slate-200 to-gold-400 bg-clip-text text-transparent">
              {t("heroTitle2")}
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            {t("heroSub")}
          </p>
        </div>

        {/* Booking Engine Box (Estilo Connecto Transfers) */}
        <div id="reservar" className="relative mx-auto max-w-4xl scroll-mt-24">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 border border-slate-100">
            {/* Trajeto Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => setIdaVolta(false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                  !idaVolta
                    ? "bg-navy-950 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                {t("oneWay")}
              </button>

              <button
                type="button"
                onClick={() => setIdaVolta(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                  idaVolta
                    ? "bg-navy-950 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {t("returnTrip")}
              </button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="relative">
                <AutocompleteCidade
                  label={t("departure")}
                  placeholder={t("departurePlaceholder")}
                  icon="origin"
                  onSelect={setOrigem}
                />
              </div>

              <div className="relative">
                <AutocompleteCidade
                  label={t("destination")}
                  placeholder={t("destinationPlaceholder")}
                  icon="destination"
                  onSelect={setDestino}
                />
              </div>
            </div>

            {/* Date & Passengers Grid */}
            <div className={`grid grid-cols-1 ${idaVolta ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-5 mb-6`}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t("departureDateTime")}
                </label>
                <input
                  type="datetime-local"
                  value={dataIda}
                  onChange={(e) => setDataIda(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium text-sm px-4 py-3.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition shadow-inner"
                />
              </div>

              {idaVolta && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t("returnDateTime")}
                  </label>
                  <input
                    type="datetime-local"
                    value={dataVolta}
                    onChange={(e) => setDataVolta(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-medium text-sm px-4 py-3.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition shadow-inner"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t("passengers")}
                </label>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-300">
                  <span className="text-sm font-bold text-slate-900">
                    {passageiros} {passageiros === 1 ? t("passenger") : t("passengers")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={passageiros <= 1}
                      onClick={() => setPassageiros((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-30 transition flex items-center justify-center"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      disabled={passageiros >= 9}
                      onClick={() => setPassageiros((p) => Math.min(9, p + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-30 transition flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit CTA Button */}
            <button
              type="button"
              onClick={buscar}
              disabled={!valido}
              className="w-full py-4 px-6 rounded-xl font-extrabold text-base uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 hover:from-gold-300 hover:to-gold-500 transition duration-200 shadow-xl hover:shadow-gold-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t("searchButton")}
            </button>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Badges (Estilo Connecto) */}
      <section id="beneficios" className="scroll-mt-20 py-12 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t("fixedFareBadge")}</h4>
                <p className="text-xs text-slate-500 mt-1">{t("fixedFareDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
              <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t("meetGreetBadge")}</h4>
                <p className="text-xs text-slate-500 mt-1">{t("meetGreetDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t("freeWaitBadge")}</h4>
                <p className="text-xs text-slate-500 mt-1">{t("freeWaitDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{t("supportBadge")}</h4>
                <p className="text-xs text-slate-500 mt-1">{t("supportDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations Showcase with Real Pictures */}
      {destinos.length > 0 && (
      <section id="destinos" className="scroll-mt-20 py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
              {t("popularTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {t("popularSub")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinos.map((d) => (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => explorarDestino(d.origem_id, d.destino_id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), explorarDestino(d.origem_id, d.destino_id))}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition group cursor-pointer"
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  {d.imagem_url && (
                    <img
                      src={d.imagem_url}
                      alt={d.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}
                  {d.etiqueta && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-navy-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      {d.etiqueta}
                    </span>
                  )}
                  {d.tempo_minutos && (
                    <span className="absolute bottom-3 right-3 text-xs font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                      ~{d.tempo_minutos} min
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition">{d.titulo}</h4>
                  {d.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.descricao}</p>}
                  {d.preco_a_partir && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{t("fromPrice")}</span>
                      <span className="text-base font-extrabold text-slate-900">{formatarPreco(Number(d.preco_a_partir))}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* FAQ — conteudo indexavel + dados estruturados */}
      <section id="faq" className="scroll-mt-20 py-16 bg-white border-t border-slate-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
              {t("faqTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-2">{t("faqSub")}</p>
          </div>

          <div className="space-y-3">
            {FAQ_ITENS.map((n) => (
              <details
                key={n}
                className="group bg-slate-50 rounded-xl border border-slate-200 open:bg-white open:shadow-sm transition"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-sm font-bold text-slate-900">
                  {t(`faq${n}q`)}
                  <svg
                    className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{t(`faq${n}a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
