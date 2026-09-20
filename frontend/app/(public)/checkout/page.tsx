"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";
import { dataViagemLocal, mensagemCliente } from "@/lib/i18n";
import { useSiteConfig } from "@/lib/SiteConfig";
import { montarSumup } from "@/lib/sumup";

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, idioma, formatarPreco } = usePreferences();
  const { sinalPct } = useSiteConfig();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [voo, setVoo] = useState("");
  const [obs, setObs] = useState("");
  const [etapa, setEtapa] = useState<"form" | "pagamento">("form");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [opcao, setOpcao] = useState<"sinal" | "integral">("integral");
  const [precoRota, setPrecoRota] = useState<number | null>(null);

  const idaVolta = params.get("tipo_trajeto") === "return";
  const dataIda = params.get("data_ida");
  const dataVolta = params.get("data_volta");
  const passageiros = params.get("passageiros") || "1";

  // Total e sinal exibidos ao cliente (o valor cobrado de fato e calculado no servidor).
  const totalEUR = precoRota !== null ? precoRota * (idaVolta ? 2 : 1) : null;
  const sinalEUR = totalEUR !== null ? Math.round(totalEUR * sinalPct) / 100 : null;

  useEffect(() => {
    api
      .get<{ preco_fixo: string; veiculo: { id: number } }[]>("/api/rotas", {
        params: { origem_id: params.get("origem_id"), destino_id: params.get("destino_id") },
      })
      .then(({ data }) => {
        const rota = data.find((r) => String(r.veiculo.id) === params.get("veiculo_id"));
        if (rota) setPrecoRota(Number(rota.preco_fixo));
      })
      .catch(() => {});
  }, [params]);

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      // 1. Cria a reserva (status PENDENTE)
      const { data: reserva } = await api.post("/api/reservas/criar", {
        origem_id: Number(params.get("origem_id")),
        destino_id: Number(params.get("destino_id")),
        veiculo_id: Number(params.get("veiculo_id")),
        data_ida: params.get("data_ida"),
        tipo_trajeto: params.get("tipo_trajeto") ?? "one_way",
        data_volta: params.get("data_volta") || null,
        numero_voo: voo || null,
        quantidade_passageiros: Number(params.get("passageiros") ?? 1),
        observacoes: obs || null,
        cliente_nome: nome,
        cliente_email: email,
        cliente_telefone: telefone,
        idioma: idioma.langKey,
      });
      setCodigo(reserva.codigo);

      // 2. Cria o checkout na SumUp (sinal ou valor integral)
      const { data: pagamento } = await api.post("/api/pagamentos/sumup/checkout", {
        codigo: reserva.codigo,
        opcao,
      });

      // 3. Monta o Card Widget
      setEtapa("pagamento");
      setTimeout(() => {
        montarSumup({
          alvoId: "sumup-widget",
          checkoutId: pagamento.checkout_id,
          idioma: idioma.langKey,
          onResultado: async (tipo) => {
            if (tipo === "success") {
              // Nao espera o webhook: confirma direto com a SumUp para a tela ja mostrar o status.
              await api.post("/api/pagamentos/sumup/sincronizar", { codigo: reserva.codigo }).catch(() => {});
              router.push(`/reserva/sucesso?codigo=${reserva.codigo}`);
            } else {
              router.push(`/reserva/cancelado?codigo=${reserva.codigo}`);
            }
          },
        }).catch(() => setErro(t("chkWidgetError")));
      }, 100);
    } catch (err: unknown) {
      setErro(mensagemCliente(err, t, idioma.langKey));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumbs */}
        <div className="mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto text-xs sm:text-sm font-semibold text-slate-400">
          <div className="flex items-center gap-2 text-brand-600">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">1</span>
            <span className="hidden sm:inline">{t("step1")}</span>
          </div>
          <div className="h-0.5 w-8 bg-brand-500" />
          <div className="flex items-center gap-2 text-brand-600">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">2</span>
            <span className="hidden sm:inline">{t("step2")}</span>
          </div>
          <div className="h-0.5 w-8 bg-brand-500" />
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-navy-950 text-gold-400 flex items-center justify-center text-xs font-bold">3</span>
            <span>{t("step3")}</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">4</span>
            <span className="hidden sm:inline">{t("step4")}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <h1 className="text-2xl font-extrabold text-slate-900 font-heading mb-2">
                {etapa === "form" ? t("passengerData") : t("proceedPayment")}
              </h1>
              <p className="text-xs text-slate-500 mb-6">
                {etapa === "form"
                  ? t("passengerSub")
                  : t("chkCardHint")}
              </p>

              {etapa === "form" ? (
                <form onSubmit={finalizar} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {t("fullName")}
                    </label>
                    <input
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder={t("phName")}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        {t("email")}
                      </label>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("phEmail")}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        {t("phone")}
                      </label>
                      <input
                        required
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder={t("phPhone")}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:outline-none transition shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>{t("flightNumber")}</span>
                      <span className="text-[10px] text-brand-600 font-semibold normal-case">{t("flightHint")}</span>
                    </label>
                    <input
                      value={voo}
                      onChange={(e) => setVoo(e.target.value)}
                      placeholder={t("phFlight")}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:outline-none transition shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      {t("specialRequests")}
                    </label>
                    <textarea
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder={t("phNotes")}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-600 focus:outline-none transition shadow-inner"
                      rows={3}
                    />
                  </div>

                  {/* Forma de pagamento: sinal ou integral */}
                  {totalEUR !== null && sinalEUR !== null && (
                    <fieldset className="pt-2">
                      <legend className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        {t("payTitle")}
                      </legend>
                      <p className="text-[11px] text-slate-500 -mt-1 mb-3">{t("chkRequiredNotice").replace("{pct}", String(sinalPct))}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["integral", "sinal"] as const).map((valor) => {
                          const ativo = opcao === valor;
                          const agora = valor === "sinal" ? sinalEUR : totalEUR;
                          return (
                            <label
                              key={valor}
                              className={`cursor-pointer rounded-xl border p-4 transition ${
                                ativo ? "border-gold-500 bg-gold-50 ring-2 ring-gold-500/30" : "border-slate-300 bg-white hover:border-slate-400"
                              }`}
                            >
                              <input
                                type="radio"
                                name="opcao-pagamento"
                                value={valor}
                                checked={ativo}
                                onChange={() => setOpcao(valor)}
                                className="sr-only"
                              />
                              <div className="text-sm font-bold text-slate-900">
                                {valor === "sinal" ? t("payDepositLabel").replace("{pct}", String(sinalPct)) : t("payFullLabel")}
                              </div>
                              <div className="text-lg font-black text-slate-900 font-heading mt-1">{formatarPreco(agora)}</div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                {valor === "sinal"
                                  ? t("payDepositDesc").replace("{resto}", formatarPreco(totalEUR - sinalEUR))
                                  : t("payFullDesc")}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" required className="mt-0.5" />
                    <span>
                      {t("chkAccept")}{" "}
                      <Link href="/conditions-generales" target="_blank" className="font-semibold text-brand-600 hover:underline">{t("termsOfService")}</Link>
                      {" · "}
                      <Link href="/confidentialite" target="_blank" className="font-semibold text-brand-600 hover:underline">{t("privacyPolicy")}</Link>
                    </span>
                  </label>

                  {erro && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <span>✕</span> {erro}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className="w-full py-4 px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 hover:from-gold-300 hover:to-gold-500 transition shadow-lg hover:shadow-gold-500/25 disabled:opacity-40 flex items-center justify-center gap-2 mt-4"
                  >
                    {enviando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-navy-950 border-t-transparent" />
                        <span>{t("chkProcessing")}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("proceedPayment")}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {codigo && (
                    <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 flex items-center justify-between">
                      <span>{t("reservationCode")}: <strong>{codigo}</strong></span>
                      <span className="font-semibold text-green-700">Aguardando Pagamento</span>
                    </div>
                  )}

                  <div className="bg-navy-950 p-6 rounded-2xl border border-navy-800 shadow-inner">
                    <div id="sumup-widget" className="min-h-[320px] flex items-center justify-center text-slate-400 text-sm" />
                  </div>

                  {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Right Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-base font-heading mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>{t("bookingSummary")}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  {t("fixedPrice")}
                </span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[10px]">{t("routeType")}</span>
                    <p className="font-bold text-slate-900 text-sm">
                      {idaVolta ? t("returnTrip") : t("oneWay")}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {passageiros} {passageiros === "1" ? t("passenger") : t("passengers")}
                    </p>
                  </div>
                </div>

                {dataIda && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">{t("departureDate")}</span>
                      <span className="font-bold text-slate-900">
                        {dataViagemLocal(dataIda, idioma.langKey)}
                      </span>
                    </div>
                    {dataVolta && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">{t("returnDate")}</span>
                        <span className="font-bold text-slate-900">
                          {dataViagemLocal(dataVolta, idioma.langKey)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{t("meetGreetBadge")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{t("freeCancel")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{t("support24")}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span>{t("paymentMethod")}</span>
                    <span>{t("paidInAdvance")}</span>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Gateway SumUp</span>
                    <span className="font-bold text-slate-900 text-xs">Cartões / Apple Pay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-navy-900 border-t-gold-400 mb-2" />
          <p className="text-sm text-slate-500">…</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
