"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/PreferencesContext";

interface Estado {
  status_pagamento: "pendente" | "parcial" | "pago";
  concluida: boolean;
  minimo: string;
  total: string;
  pago: string;
  saldo: string;
}

function SucessoContent() {
  const codigo = (useSearchParams().get("codigo") || "").toUpperCase();
  const { t, formatarPreco } = usePreferences();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [verificando, setVerificando] = useState(true);

  // O status vem do banco (confirmado pela SumUp), nao do redirecionamento do navegador.
  useEffect(() => {
    if (!codigo) return setVerificando(false);
    let cancelado = false;
    (async () => {
      for (let tentativa = 0; tentativa < 4 && !cancelado; tentativa++) {
        try {
          const { data } = await api.get<Estado>("/api/reservas/status", { params: { codigo } });
          if (cancelado) return;
          setEstado(data);
          if (data.status_pagamento !== "pendente") break;
          await api.post("/api/pagamentos/sumup/sincronizar", { codigo }).catch(() => {});
        } catch {
          break;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!cancelado) setVerificando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [codigo]);

  // A reserva so esta concluida com pelo menos o sinal minimo (ou o total) pago.
  const pago = estado?.status_pagamento === "pago";
  const parcial = estado?.status_pagamento === "parcial" && estado.concluida;
  const abaixoDoMinimo = estado?.status_pagamento === "parcial" && !estado.concluida;
  const faltaParaMinimo = estado ? Math.max(0, Number(estado.minimo) - Number(estado.pago)) : 0;

  return (
    <div className="w-full bg-slate-50 min-h-screen py-16 px-4 sm:px-6">
      <main className="mx-auto max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center">
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border shadow-sm ${pago || parcial ? "bg-green-50 border-green-200 text-green-600" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
          {verificando && !estado ? (
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-slate-700" />
          ) : (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={pago || parcial ? "M5 13l4 4L19 7" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
          )}
        </div>

        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${pago || parcial ? "text-green-700 bg-green-100" : "text-amber-800 bg-amber-100"}`}>
          {pago ? t("statusPaid") : parcial ? t("statusDeposit") : verificando ? t("checkingPayment") : t("statusPending")}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-4 mb-2">{t("bookingSuccessTitle")}</h1>
        <p className="text-sm text-slate-600">
          {pago
            ? t("bookingSuccessSub")
            : parcial
            ? t("depositReceivedMsg")
            : abaixoDoMinimo
            ? t("payMinMissing").replace("{resto}", formatarPreco(faltaParaMinimo)).replace("{minimo}", formatarPreco(Number(estado!.minimo)))
            : t("pendingMsg")}
        </p>

        {codigo && (
          <div className="my-6 p-4 rounded-2xl bg-navy-950 text-white flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400">{t("voucherCode")}</span>
              <div className="text-xl font-black text-gold-400 font-heading tracking-wider">{codigo}</div>
            </div>
            {estado && (
              <div className="text-right text-xs text-slate-300">
                <div>{t("statusPaid")}: <strong className="text-white">{formatarPreco(Number(estado.pago))}</strong></div>
                {(parcial || abaixoDoMinimo) && <div>{t("balanceDue")}: <strong className="text-gold-400">{formatarPreco(Number(estado.saldo))}</strong></div>}
              </div>
            )}
          </div>
        )}

        {(parcial || abaixoDoMinimo) && (
          <Link
            href={`/reserva/pagar?codigo=${codigo}`}
            className="mb-4 inline-flex items-center justify-center w-full py-3 px-6 rounded-xl font-bold text-sm text-navy-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 transition shadow-md"
          >
            {t("payBalanceNow")}
          </Link>
        )}

        <div className="text-left text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-8">
          <div className="font-bold text-slate-900 text-sm mb-1">{t("nextSteps")}</div>
          <div className="flex items-start gap-2"><span className="text-gold-600 font-bold">1.</span><span>{t("step1Desc")}</span></div>
          <div className="flex items-start gap-2"><span className="text-gold-600 font-bold">2.</span><span>{t("step2Desc")}</span></div>
          <div className="flex items-start gap-2"><span className="text-gold-600 font-bold">3.</span><span>{t("step3Desc")}</span></div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-navy-950 hover:bg-navy-900 font-bold text-sm text-white transition shadow-lg"
        >
          <span>{t("newBooking")}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </main>
    </div>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center">…</p>}>
      <SucessoContent />
    </Suspense>
  );
}
