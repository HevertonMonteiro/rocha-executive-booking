"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";
import { dataViagemLocal, mensagemCliente } from "@/lib/i18n";

interface Rota {
  id: number;
  veiculo: {
    id: number;
    nome: string;
    slug?: string;
    capacidade_passageiros: number;
    capacidade_malas: number;
    descricao: string | null;
    imagem_url?: string | null;
  };
  preco_fixo: string;
  tempo_estimado_minutos: number | null;
  disponivel?: boolean | null;
  proximo_horario_disponivel?: string | null;
}

function paraDatetimeLocal(isoString: string): string {
  // "2026-10-01T11:45:00" (API, sem timezone) -> "2026-10-01T11:45" (input datetime-local)
  return isoString.slice(0, 16);
}

function SelecaoContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { formatarPreco, moeda, t, idioma } = usePreferences();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [erroApi, setErroApi] = useState<unknown>(null);
  const erro = erroApi !== null;
  const [carregando, setCarregando] = useState(true);

  const [idaVolta, setIdaVolta] = useState(params.get("tipo_trajeto") === "return");
  const [dataIda, setDataIda] = useState(params.get("data_ida") || "");
  const [dataVolta, setDataVolta] = useState(params.get("data_volta") || "");
  const [passageiros, setPassageiros] = useState(Number(params.get("passageiros")) || 1);

  useEffect(() => {
    setCarregando(true);
    api
      .get<Rota[]>("/api/rotas", {
        params: {
          origem_id: params.get("origem_id"),
          destino_id: params.get("destino_id"),
          data_ida: dataIda || undefined,
          tipo_trajeto: idaVolta ? "return" : "one_way",
          data_volta: idaVolta ? dataVolta || undefined : undefined,
        },
      })
      .then(({ data }) => {
        setRotas(data);
        setErroApi(null);
      })
      .catch((e) => setErroApi(e ?? true))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, dataIda, idaVolta, dataVolta]);

  function selecionar(rota: Rota) {
    if (rota.disponivel === false || passageiros > rota.veiculo.capacidade_passageiros) return;
    const query = new URLSearchParams(params.toString());
    query.set("veiculo_id", String(rota.veiculo.id));
    query.set("tipo_trajeto", idaVolta ? "return" : "one_way");
    query.set("data_ida", dataIda);
    query.set("passageiros", String(passageiros));
    if (idaVolta) {
      query.set("data_volta", dataVolta);
    } else {
      query.delete("data_volta");
    }
    router.push(`/checkout?${query.toString()}`);
  }

  function usarProximoHorario(rota: Rota) {
    if (!rota.proximo_horario_disponivel) return;
    setDataIda(paraDatetimeLocal(rota.proximo_horario_disponivel));
  }

  function getVehicleDetails(nome: string) {
    const lower = nome.toLowerCase();
    if (lower.includes("sedan") || lower.includes("mercedes sedan")) {
      return {
        badge: t("vhSedanBadge"),
        badgeColor: "bg-navy-950 text-gold-400 border border-gold-500/30",
        categoria: t("vhSedanCat"),
        modelos: t("vhSedanModels"),
        features: [t("vhSedanF1"), t("vhSedanF2"), t("vhSedanF3"), t("vhSedanF4")],
        imagem: "/images/vehicles/mercedes-sedan.jpg",
      };
    }
    if (lower.includes("van") || lower.includes("mercedes van")) {
      return {
        badge: t("vhVanBadge"),
        badgeColor: "bg-brand-900 text-brand-200 border border-brand-700",
        categoria: t("vhVanCat"),
        modelos: t("vhVanModels"),
        features: [t("vhVanF1"), t("vhVanF2"), t("vhVanF3"), t("vhVanF4")],
        imagem: "/images/vehicles/mercedes-van.jpg",
      };
    }
    return {
      badge: t("vhBaseBadge"),
      badgeColor: "bg-slate-100 text-slate-700 border border-slate-300",
      categoria: t("vhBaseCat"),
      modelos: t("vhBaseModels"),
      features: [t("vhBaseF1"), t("vhBaseF2"), t("vhBaseF3"), t("vhBaseF4")],
      imagem: "/images/vehicles/toyota-hatchback.jpg",
    };
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb Steps */}
        <div className="mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto text-xs sm:text-sm font-semibold text-slate-400">
          <div className="flex items-center gap-2 text-brand-600">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">1</span>
            <span className="hidden sm:inline">{t("step1")}</span>
          </div>
          <div className="h-0.5 w-8 bg-brand-500" />
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-navy-950 text-gold-400 flex items-center justify-center text-xs font-bold">2</span>
            <span>{t("step2")}</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">3</span>
            <span className="hidden sm:inline">{t("step3")}</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">4</span>
            <span className="hidden sm:inline">{t("step4")}</span>
          </div>
        </div>

        {/* Resumo & Edição da Viagem */}
        <div className="mb-8 bg-navy-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-navy-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center text-gold-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{t("selectedRoute")}</div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs font-bold text-slate-300 hover:text-gold-400 bg-navy-800 px-4 py-2 rounded-lg border border-navy-700 transition"
            >
              {t("changeSearch")}
            </button>
          </div>

          {/* Trajeto Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setIdaVolta(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition ${
                !idaVolta
                  ? "bg-gold-500 text-navy-950 shadow-md"
                  : "bg-navy-800 text-slate-300 hover:bg-navy-700"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition ${
                idaVolta
                  ? "bg-gold-500 text-navy-950 shadow-md"
                  : "bg-navy-800 text-slate-300 hover:bg-navy-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {t("returnTrip")}
            </button>
          </div>

          {/* Datas & Passageiros — editáveis */}
          <div className={`grid grid-cols-1 ${idaVolta ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t("departureDateTime")}
              </label>
              <input
                type="datetime-local"
                value={dataIda}
                onChange={(e) => setDataIda(e.target.value)}
                className="w-full bg-navy-800 hover:bg-navy-700 focus:bg-navy-700 text-white font-medium text-sm px-3.5 py-2.5 rounded-xl border border-navy-700 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition"
              />
            </div>

            {idaVolta && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {t("returnDateTime")}
                </label>
                <input
                  type="datetime-local"
                  value={dataVolta}
                  onChange={(e) => setDataVolta(e.target.value)}
                  className="w-full bg-navy-800 hover:bg-navy-700 focus:bg-navy-700 text-white font-medium text-sm px-3.5 py-2.5 rounded-xl border border-navy-700 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 focus:outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {t("passengers")}
              </label>
              <div className="flex items-center justify-between bg-navy-800 px-3.5 py-2 rounded-xl border border-navy-700">
                <span className="text-sm font-bold text-white">
                  {passageiros} {passageiros === 1 ? t("passenger") : t("passengers")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={passageiros <= 1}
                    onClick={() => setPassageiros((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-white font-bold hover:bg-navy-600 disabled:opacity-30 transition flex items-center justify-center"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={passageiros >= 9}
                    onClick={() => setPassageiros((p) => Math.min(9, p + 1))}
                    className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-white font-bold hover:bg-navy-600 disabled:opacity-30 transition flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {carregando && (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-navy-900 border-t-gold-400 mb-4" />
            <p className="text-sm font-semibold text-slate-700">{t("selCalculating")}</p>
          </div>
        )}

        {erro && (
          <div className="py-16 text-center bg-white rounded-2xl border border-red-200 p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">✕</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t("selNoRouteTitle")}</h3>
            <p className="text-sm text-slate-500 mb-6">{mensagemCliente(erroApi, t, idioma.langKey)}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 rounded-xl bg-navy-950 text-white font-bold text-sm hover:bg-slate-800 transition"
            >
              {t("selBackToSearch")}
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold text-slate-900 font-heading">
                {t("chooseVehicle")}
              </h1>
              <span className="text-xs text-slate-500 font-medium">
                {rotas.length} {t("optionsAvailable")}
              </span>
            </div>

            <div className="grid gap-6">
              {rotas.map((rota) => {
                const precoEUR = Number(rota.preco_fixo) * (idaVolta ? 2 : 1);
                const info = getVehicleDetails(rota.veiculo.nome);

                const excedeCapacidade = passageiros > rota.veiculo.capacidade_passageiros;
                const indisponivel = rota.disponivel === false || excedeCapacidade;

                return (
                  <div
                    key={rota.id}
                    role="button"
                    tabIndex={indisponivel ? -1 : 0}
                    aria-disabled={indisponivel}
                    onClick={() => selecionar(rota)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selecionar(rota);
                      }
                    }}
                    className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group overflow-hidden ${
                      indisponivel
                        ? "border-slate-200 opacity-60 cursor-not-allowed"
                        : "border-slate-200 hover:border-brand-500/60 hover:shadow-xl cursor-pointer"
                    }`}
                  >
                    {/* Vehicle Real Image */}
                    <div className="w-full md:w-52 h-36 rounded-xl overflow-hidden relative shrink-0 bg-slate-100 border border-slate-200">
                      <img
                        src={rota.veiculo.imagem_url || info.imagem}
                        alt={rota.veiculo.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-navy-950/80 text-white backdrop-blur-sm">
                        {info.categoria.split(" ")[0]}
                      </span>
                    </div>

                    {/* Left: Vehicle Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${info.badgeColor}`}>
                          {info.badge}
                        </span>
                        {rota.tempo_estimado_minutos && (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ~{rota.tempo_estimado_minutos} min
                          </span>
                        )}
                        {rota.disponivel === true && (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            ● {t("selAvailable")}
                          </span>
                        )}
                        {excedeCapacidade && (
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                            ● {t("selCapacity").replace("{max}", String(rota.veiculo.capacidade_passageiros))}
                          </span>
                        )}
                        {rota.disponivel === false && !excedeCapacidade && (
                          <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            ● {t("selUnavailable")}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 font-heading group-hover:text-brand-700 transition">
                        {rota.veiculo.nome}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mb-3">
                        {info.modelos}
                      </p>

                      {/* Capacities */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 mb-3 bg-slate-50 p-2 rounded-xl inline-flex">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {t("maxPassengers")} {rota.veiculo.capacidade_passageiros} {t("passengers")}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {t("maxPassengers")} {rota.veiculo.capacidade_malas} {t("maxLuggage")}
                        </span>
                      </div>

                      {/* Feature Bullets */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {info.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Price & CTA */}
                    <div className="w-full md:w-52 flex flex-col items-end md:border-l md:border-slate-100 md:pl-6 pt-4 md:pt-0 border-t border-slate-100 md:border-t-0 shrink-0">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{t("totalFixedPrice")}</span>
                      <div className="text-3xl font-black text-slate-900 font-heading">
                        {formatarPreco(precoEUR)}
                      </div>
                      {moeda.codigo !== "EUR" && (
                        <span className="text-[10px] text-slate-400">
                          (aprox. {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(precoEUR)})
                        </span>
                      )}
                      <span className="text-[11px] text-green-700 font-semibold mt-0.5">
                        {idaVolta ? "✓ " + t("returnTrip") : "✓ " + t("noHiddenFees")}
                      </span>

                      {rota.disponivel === false && !excedeCapacidade && rota.proximo_horario_disponivel && (
                        <p className="text-[11px] text-slate-500 mt-3 text-right">
                          {t("selNextFree")}{" "}
                          <strong className="text-slate-700">
                            {dataViagemLocal(rota.proximo_horario_disponivel, idioma.langKey)}
                          </strong>
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (excedeCapacidade) return;
                          if (indisponivel) {
                            usarProximoHorario(rota);
                          } else {
                            selecionar(rota);
                          }
                        }}
                        disabled={excedeCapacidade || (indisponivel && !rota.proximo_horario_disponivel)}
                        className={`w-full mt-4 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                          indisponivel
                            ? "text-white bg-slate-700 hover:bg-slate-800"
                            : "text-navy-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 hover:shadow-gold-500/20 group-hover:scale-[1.02]"
                        }`}
                      >
                        <span>{excedeCapacidade ? t("selCapacityShort") : indisponivel ? t("selUseNext") : t("bookNow")}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SelecaoPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-navy-900 border-t-gold-400 mb-2" />
          <p className="text-sm text-slate-500">…</p>
        </div>
      }
    >
      <SelecaoContent />
    </Suspense>
  );
}
