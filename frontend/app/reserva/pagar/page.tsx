"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";
import { montarSumup } from "@/lib/sumup";
import { mensagemCliente } from "@/lib/i18n";

interface Estado {
  status_pagamento: "pendente" | "parcial" | "pago";
  status: string;
  total: string;
  pago: string;
  saldo: string;
}

// Pagamento do saldo (ou nova tentativa de pagamento) de uma reserva ja criada.
function PagarContent() {
  const router = useRouter();
  const codigo = (useSearchParams().get("codigo") || "").toUpperCase();
  const { t, idioma, formatarPreco } = usePreferences();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    api
      .get<Estado>("/api/reservas/status", { params: { codigo } })
      .then(({ data }) => setEstado(data))
      .catch((e) => setErro(mensagemCliente(e, t, idioma.langKey)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  async function iniciar() {
    setErro("");
    try {
      const { data } = await api.post("/api/pagamentos/sumup/checkout", { codigo, opcao: "integral" });
      setPronto(true);
      setTimeout(() => {
        montarSumup({
          alvoId: "sumup-widget",
          checkoutId: data.checkout_id,
          idioma: idioma.langKey,
          onResultado: async (tipo) => {
            if (tipo === "success") {
              await api.post("/api/pagamentos/sumup/sincronizar", { codigo }).catch(() => {});
              router.push(`/reserva/sucesso?codigo=${codigo}`);
            } else {
              router.push(`/reserva/cancelado?codigo=${codigo}`);
            }
          },
        }).catch(() => setErro(t("chkWidgetError")));
      }, 100);
    } catch (e: unknown) {
      setErro(mensagemCliente(e, t, idioma.langKey));
    }
  }

  const quitada = estado?.status_pagamento === "pago";

  return (
    <div className="w-full bg-slate-50 min-h-screen py-16 px-4 sm:px-6">
      <main className="mx-auto max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10">
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading mb-1">{t("payBalanceTitle")}</h1>
        <p className="text-xs text-slate-500 mb-6">
          {t("reservationCode")}: <strong className="text-slate-900">{codigo}</strong>
        </p>

        {erro && <p role="alert" className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        {estado && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Total</span><strong>{formatarPreco(Number(estado.total))}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">{t("statusPaid")}</span><strong>{formatarPreco(Number(estado.pago))}</strong></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-bold">{t("balanceDue")}</span><strong className="text-lg">{formatarPreco(Number(estado.saldo))}</strong></div>
            </div>

            {quitada ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">{t("nothingToPay")}</p>
            ) : pronto ? (
              <div className="bg-navy-950 p-6 rounded-2xl border border-navy-800">
                <div id="sumup-widget" className="min-h-[320px]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={iniciar}
                className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 hover:from-gold-300 hover:to-gold-500 transition shadow-lg"
              >
                {t("payBalanceNow")}
              </button>
            )}
          </div>
        )}

        <Link href="/" className="block text-center text-xs font-semibold text-slate-500 hover:text-slate-800 mt-6">
          ← {t("partnerBack")}
        </Link>
      </main>
    </div>
  );
}

export default function PagarPage() {
  return (
    <Suspense fallback={null}>
      <PagarContent />
    </Suspense>
  );
}
