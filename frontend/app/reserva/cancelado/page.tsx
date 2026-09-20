"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePreferences } from "@/lib/PreferencesContext";

function CanceladoContent() {
  const { t } = usePreferences();
  const codigo = useSearchParams().get("codigo");

  return (
    <div className="w-full bg-slate-50 min-h-screen py-16 px-4 sm:px-6">
      <main className="mx-auto max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
          {t("cancelTitle")}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-4 mb-2">{t("cancelTitle")}</h1>
        <p className="text-sm text-slate-600 mb-6">{t("cancelSub")}</p>
        {codigo && (
          <p className="text-xs text-slate-500 mb-6">
            {t("reservationCode")}: <strong className="text-slate-900">{codigo}</strong>
          </p>
        )}

        <Link
          href={codigo ? `/reserva/pagar?codigo=${encodeURIComponent(codigo)}` : "/"}
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-navy-950 hover:bg-navy-900 font-bold text-sm text-white transition shadow-lg"
        >
          <span>{t("tryAgain")}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </main>
    </div>
  );
}

export default function CanceladoPage() {
  return (
    <Suspense fallback={null}>
      <CanceladoContent />
    </Suspense>
  );
}
