"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/lib/PreferencesContext";
import { useSiteConfig, type VeiculoPublico } from "@/lib/SiteConfig";
import { linkRotaRapida } from "@/lib/rotas";

export default function Footer() {
  const { t } = usePreferences();
  const router = useRouter();
  const site = useSiteConfig();
  const [veiculoAberto, setVeiculoAberto] = useState<VeiculoPublico | null>(null);

  // Regioes = etiquetas distintas dos destinos populares (cadastrados no painel).
  const regioes = site.destinos.filter(
    (d, i, todos) => d.etiqueta && todos.findIndex((x) => x.etiqueta === d.etiqueta) === i
  );

  return (
    <footer className="bg-navy-950 text-slate-400 border-t border-navy-800 mt-20 pt-14 pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-navy-950 text-sm">
                R
              </div>
              <span className="text-base font-bold text-white uppercase tracking-wider font-heading">
                Rocha <span className="text-gold-400 font-light">Executive</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{t("footerDesc")}</p>
            <div className="flex items-center gap-3 text-gold-400">
              <span className="text-xs font-semibold bg-navy-900 border border-navy-800 px-2.5 py-1 rounded-full">
                {t("reviewsCount")}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider font-heading">
              {t("topRegions")}
            </h4>
            <ul className="space-y-2 text-xs">
              {regioes.map((d) => (
                <li key={d.etiqueta}>
                  <button
                    type="button"
                    onClick={() => router.push(linkRotaRapida(d.origem_id, d.destino_id))}
                    className="hover:text-gold-400 transition text-left"
                  >
                    {d.etiqueta}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider font-heading">
              {t("ourFleet")}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {site.veiculos.map((veiculo) => (
                <li key={veiculo.id}>
                  <button
                    type="button"
                    onClick={() => setVeiculoAberto(veiculo)}
                    className="flex items-center gap-2.5 hover:text-gold-400 transition text-left"
                  >
                    {veiculo.imagem_url && (
                      <img
                        src={veiculo.imagem_url}
                        alt={veiculo.nome}
                        className="w-10 h-8 rounded-md object-cover border border-navy-800 shrink-0"
                      />
                    )}
                    <span>{veiculo.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider font-heading">
              {t("callCenter")}
            </h4>
            <p className="text-xs text-slate-400 mb-2">{t("callCenterSub")}</p>
            <a
              href={site.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 mb-3 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg transition"
            >
              <span>{site.whatsapp_exibicao}</span>
            </a>
            {site.email_contato && (
              <p className="text-xs mb-2">
                <a href={`mailto:${site.email_contato}`} className="hover:text-gold-400 transition">
                  {site.email_contato}
                </a>
              </p>
            )}
            {site.endereco && <p className="text-xs mb-3 text-slate-500">{site.endereco}</p>}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span className="bg-navy-900 border border-navy-800 px-2 py-1 rounded text-[10px]">{t("support24")}</span>
              <span className="bg-navy-900 border border-navy-800 px-2 py-1 rounded text-[10px]">{t("privateChauffeurBadge")}</span>
            </div>
            {(site.instagram_url || site.facebook_url) && (
              <div className="flex items-center gap-3 mt-3 text-xs">
                {site.instagram_url && (
                  <a href={site.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 transition">
                    Instagram
                  </a>
                )}
                {site.facebook_url && (
                  <a href={site.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-gold-400 transition">
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {new Date().getFullYear()} {site.empresa_nome}. {t("allRightsReserved")}
            {site.siret && <span className="ml-2">SIRET {site.siret}</span>}
          </p>
          <div className="flex gap-4">
            <Link href="/parceiro" className="hover:text-slate-400 transition">{t("navPartner")}</Link>
            <Link href="/conditions-generales" className="hover:text-slate-400 transition">{t("termsOfService")}</Link>
            <Link href="/confidentialite" className="hover:text-slate-400 transition">{t("privacyPolicy")}</Link>
            <Link href="/mentions-legales" className="hover:text-slate-400 transition">{t("legalNotice")}</Link>
          </div>
        </div>
      </div>

      {veiculoAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setVeiculoAberto(null)}
        >
          <div
            className="relative w-full max-w-lg bg-navy-900 rounded-2xl overflow-hidden border border-navy-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVeiculoAberto(null)}
              aria-label="Fechar"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition z-10"
            >
              ✕
            </button>
            {veiculoAberto.imagem_url && (
              <img src={veiculoAberto.imagem_url} alt={veiculoAberto.nome} className="w-full h-72 object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-white font-bold text-base">{veiculoAberto.nome}</h3>
                <Link
                  href="/#reservar"
                  onClick={() => setVeiculoAberto(null)}
                  className="shrink-0 text-xs font-bold uppercase tracking-wider text-navy-950 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 px-4 py-2.5 rounded-xl transition"
                >
                  {t("searchButton")}
                </Link>
              </div>
              {veiculoAberto.descricao && <p className="text-xs text-slate-400 mt-2">{veiculoAberto.descricao}</p>}
              <p className="text-[11px] text-slate-500 mt-2">
                {veiculoAberto.capacidade_passageiros} {t("passengers")} · {veiculoAberto.capacidade_malas} {t("maxLuggage")}
              </p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
