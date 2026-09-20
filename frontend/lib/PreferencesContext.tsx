"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "@/lib/translations";

export interface Moeda {
  codigo: string;
  simbolo: string;
  nome: string;
  taxa: number; // taxa em relacao ao EUR
}

export const MOEDAS_DISPONIVEIS: Moeda[] = [
  { codigo: "EUR", simbolo: "€", nome: "Euro", taxa: 1.0 },
  { codigo: "USD", simbolo: "$", nome: "US Dollar", taxa: 1.08 },
  { codigo: "BRL", simbolo: "R$", nome: "Real Brasileiro", taxa: 5.95 },
  { codigo: "GBP", simbolo: "£", nome: "British Pound", taxa: 0.85 },
  { codigo: "CHF", simbolo: "CHF", nome: "Swiss Franc", taxa: 0.96 },
  { codigo: "CAD", simbolo: "CA$", nome: "Canadian Dollar", taxa: 1.48 },
  { codigo: "AUD", simbolo: "A$", nome: "Australian Dollar", taxa: 1.65 },
  { codigo: "JPY", simbolo: "¥", nome: "Japanese Yen", taxa: 168.5 },
  { codigo: "AED", simbolo: "AED", nome: "Emirati Dirham", taxa: 3.97 },
  { codigo: "CNY", simbolo: "¥", nome: "Chinese Yuan", taxa: 7.82 },
  { codigo: "MXN", simbolo: "Mex$", nome: "Mexican Peso", taxa: 19.8 },
  { codigo: "SEK", simbolo: "kr", nome: "Swedish Krona", taxa: 11.4 },
  { codigo: "NOK", simbolo: "kr", nome: "Norwegian Krone", taxa: 11.6 },
  { codigo: "DKK", simbolo: "kr", nome: "Danish Krone", taxa: 7.46 },
  { codigo: "PLN", simbolo: "zł", nome: "Polish Zloty", taxa: 4.28 },
  { codigo: "CZK", simbolo: "Kč", nome: "Czech Koruna", taxa: 25.1 },
  { codigo: "ILS", simbolo: "₪", nome: "Israeli Shekel", taxa: 4.02 },
  { codigo: "SAR", simbolo: "SR", nome: "Saudi Riyal", taxa: 4.05 },
];

export interface Idioma {
  codigo: string;
  langKey: Language;
  nome: string;
  bandeira: string;
}

export const IDIOMAS_DISPONIVEIS: Idioma[] = [
  { codigo: "PT", langKey: "pt", nome: "Português", bandeira: "🇵🇹" },
  { codigo: "EN", langKey: "en", nome: "English", bandeira: "🇬🇧" },
  { codigo: "FR", langKey: "fr", nome: "Français", bandeira: "🇫🇷" },
  { codigo: "ES", langKey: "es", nome: "Español", bandeira: "🇪🇸" },
  { codigo: "DE", langKey: "de", nome: "Deutsch", bandeira: "🇩🇪" },
  { codigo: "IT", langKey: "it", nome: "Italiano", bandeira: "🇮🇹" },
];

// Site voltado ao publico da Franca: sem preferencia salva nem idioma suportado
// no navegador, o visitante ve o site em frances.
const IDIOMA_PADRAO: Idioma = IDIOMAS_DISPONIVEIS.find((i) => i.langKey === "fr")!;

interface PreferencesContextType {
  moeda: Moeda;
  setMoeda: (moeda: Moeda) => void;
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  formatarPreco: (valorEmEUR: number) => string;
  t: (chave: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType>({
  moeda: MOEDAS_DISPONIVEIS[0],
  setMoeda: () => {},
  idioma: IDIOMA_PADRAO,
  setIdioma: () => {},
  formatarPreco: (val) => `€ ${val.toFixed(2)}`,
  t: (k) => k,
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [moeda, setMoedaState] = useState<Moeda>(MOEDAS_DISPONIVEIS[0]);
  const [idioma, setIdiomaState] = useState<Idioma>(IDIOMA_PADRAO);

  useEffect(() => {
    const savedMoeda = localStorage.getItem("rocha_moeda");
    if (savedMoeda) {
      const found = MOEDAS_DISPONIVEIS.find((m) => m.codigo === savedMoeda);
      if (found) setMoedaState(found);
    }
    const savedIdioma = localStorage.getItem("rocha_idioma");
    const salvo = IDIOMAS_DISPONIVEIS.find((i) => i.codigo === savedIdioma);
    if (salvo) {
      setIdiomaState(salvo);
    } else {
      const doNavegador = IDIOMAS_DISPONIVEIS.find(
        (i) => i.langKey === navigator.language.slice(0, 2).toLowerCase()
      );
      if (doNavegador) setIdiomaState(doNavegador);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma.langKey;
  }, [idioma]);

  function setMoeda(m: Moeda) {
    setMoedaState(m);
    localStorage.setItem("rocha_moeda", m.codigo);
  }

  function setIdioma(i: Idioma) {
    setIdiomaState(i);
    localStorage.setItem("rocha_idioma", i.codigo);
  }

  function t(chave: string): string {
    const lang = idioma.langKey;
    if (translations[lang] && translations[lang][chave]) {
      return translations[lang][chave];
    }
    return translations.en[chave] || translations.pt[chave] || chave;
  }

  function formatarPreco(valorEmEUR: number): string {
    const valorConvertido = valorEmEUR * moeda.taxa;
    if (moeda.codigo === "EUR") {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(valorEmEUR);
    }
    if (moeda.codigo === "BRL") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorConvertido);
    }
    if (moeda.codigo === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valorConvertido);
    }
    if (moeda.codigo === "GBP") {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(valorConvertido);
    }
    return `${moeda.simbolo} ${valorConvertido.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
  }

  return (
    <PreferencesContext.Provider value={{ moeda, setMoeda, idioma, setIdioma, formatarPreco, t }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
