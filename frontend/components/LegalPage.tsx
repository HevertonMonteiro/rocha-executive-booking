"use client";

import Link from "next/link";
import { usePreferences } from "@/lib/PreferencesContext";
import { useSiteConfig } from "@/lib/SiteConfig";
import { localeDe } from "@/lib/i18n";
import { ATUALIZADO_EM, CGV, CONFIDENTIALITE, MENTIONS, ROTULO_ATUALIZADO, type DocLegal } from "@/lib/legal";

type Tipo = "cgv" | "confidentialite" | "mentions";

function Casca({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  const { idioma, t } = usePreferences();
  const data = new Date(`${ATUALIZADO_EM}T12:00:00Z`).toLocaleDateString(localeDe(idioma.langKey), { dateStyle: "long", timeZone: "UTC" });
  return (
    <div className="w-full bg-slate-50 py-12 px-4 sm:px-6">
      <article className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
        <h1 className="text-3xl font-extrabold text-slate-900 font-heading mb-2">{titulo}</h1>
        <p className="text-xs text-slate-400 mb-1">{sub}</p>
        <p className="text-xs text-slate-400 mb-8">
          {ROTULO_ATUALIZADO[idioma.langKey]} : {data}
        </p>
        {children}
        <div className="mt-10 pt-6 border-t border-slate-100">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            ← {t("partnerBack")}
          </Link>
        </div>
      </article>
    </div>
  );
}

export default function LegalPage({ tipo }: { tipo: Tipo }) {
  const { idioma } = usePreferences();
  const site = useSiteConfig();
  const lang = idioma.langKey;

  const contato = [site.email_contato, site.whatsapp_exibicao].filter(Boolean).join(" · ");
  const preencher = (texto: string) =>
    texto
      .replaceAll("{empresa}", site.empresa_nome)
      .replaceAll("{sinal}", String(site.sinalPct))
      .replaceAll("{contato}", contato)
      .replaceAll("{mediateur}", site.mediateur_consommation);

  if (tipo === "mentions") {
    const m = MENTIONS[lang];
    const linhas: [string, string][] = (
      [
        [m.denominacao, site.empresa_nome],
        [m.forma, site.forme_juridique],
        [m.capital, site.capital_social],
        [m.sede, site.endereco],
        [m.siret, site.siret],
        [m.tva, site.tva_intracom],
        [m.diretor, site.directeur_publication],
        [m.contato, contato],
      ] as [string, string][]
    ).filter(([, v]) => v);
    return (
      <Casca titulo={m.titulo} sub={m.sub}>
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">{m.editor}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {linhas.map(([rotulo, valor]) => (
                <div key={rotulo} className="contents">
                  <dt className="text-slate-500">{rotulo}</dt>
                  <dd className="sm:col-span-2 font-medium text-slate-800">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section><h2 className="text-base font-bold text-slate-900 mb-2">{m.hospedagem}</h2><p>{m.hospedagemTexto}</p></section>
          <section><h2 className="text-base font-bold text-slate-900 mb-2">{m.pagamento}</h2><p>{m.pagamentoTexto}</p></section>
          <section><h2 className="text-base font-bold text-slate-900 mb-2">{m.pi}</h2><p>{m.piTexto}</p></section>
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2">{m.dados}</h2>
            <p>{m.dadosTexto}</p>
            <p className="mt-2 flex flex-wrap gap-x-4">
              <Link href="/confidentialite" className="text-brand-600 hover:underline font-semibold">{m.links.conf}</Link>
              <Link href="/conditions-generales" className="text-brand-600 hover:underline font-semibold">{m.links.cgv}</Link>
            </p>
          </section>
          {site.mediateur_consommation && (
            <section><h2 className="text-base font-bold text-slate-900 mb-2">{m.mediacao}</h2><p>{m.mediacaoTexto} {site.mediateur_consommation}</p></section>
          )}
        </div>
      </Casca>
    );
  }

  const doc: DocLegal = (tipo === "cgv" ? CGV : CONFIDENTIALITE)[lang];
  return (
    <Casca titulo={doc.titulo} sub={preencher(doc.sub)}>
      <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
        {doc.secoes
          .filter((s) => s.cond !== "mediateur" || site.mediateur_consommation)
          .map((s) => (
            <section key={s.t}>
              <h2 className="text-base font-bold text-slate-900 mb-2">{s.t}</h2>
              {s.p?.map((p) => (
                <p key={p} className="mb-2">{preencher(p)}</p>
              ))}
              {s.l && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.l.map((i) => (
                    <li key={i}>{preencher(i)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
      </div>
    </Casca>
  );
}
