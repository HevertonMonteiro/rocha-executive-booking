"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";

// ---------------------------------------------------------------------------
// Formatacao
// ---------------------------------------------------------------------------
const moeda = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function eur(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return moeda.format(Number(valor));
}

/** Data/hora de viagem: relogio local da Franca, sem conversao de fuso ("2026-10-01 10:00:00" -> "01/10/2026 10:00"). */
export function dataViagem(valor?: string | null): string {
  if (!valor) return "—";
  const m = valor.replace(" ", "T").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : valor;
}

/** Momentos registrados pelo sistema (pagamentos, cadastros), exibidos no horario da Franca. */
export function dataSistema(valor?: string | null): string {
  if (!valor) return "—";
  let iso = valor.replace(" ", "T");
  if (/[+-]\d\d$/.test(iso)) iso += ":00";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? valor
    : d.toLocaleString("pt-BR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
}

export const paraInputDataHora = (valor?: string | null) => (valor ? valor.replace(" ", "T").slice(0, 16) : "");

// ---------------------------------------------------------------------------
// Estilos base
// ---------------------------------------------------------------------------
export const inputCls =
  "w-full bg-white text-slate-900 text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:border-navy-800 focus:ring-2 focus:ring-gold-500/30 focus:outline-none transition disabled:bg-slate-100";

const CORES: Record<string, string> = {
  cinza: "bg-slate-100 text-slate-700",
  verde: "bg-green-100 text-green-800",
  amarelo: "bg-amber-100 text-amber-800",
  vermelho: "bg-red-100 text-red-800",
  azul: "bg-blue-100 text-blue-800",
  roxo: "bg-purple-100 text-purple-800",
};

export function Badge({ cor = "cinza", children }: { cor?: keyof typeof CORES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CORES[cor]}`}>{children}</span>;
}

export const STATUS_RESERVA: Record<string, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "amarelo" },
  confirmado: { rotulo: "Confirmada", cor: "azul" },
  finalizado: { rotulo: "Finalizada", cor: "verde" },
  cancelado: { rotulo: "Cancelada", cor: "vermelho" },
};

export const STATUS_PAGAMENTO: Record<string, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Sem pagamento", cor: "vermelho" },
  parcial: { rotulo: "Sinal pago", cor: "amarelo" },
  pago: { rotulo: "Pago", cor: "verde" },
};

export const STATUS_PARCEIRO: Record<string, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Aguardando análise", cor: "amarelo" },
  aprovado: { rotulo: "Aprovado", cor: "verde" },
  recusado: { rotulo: "Recusado", cor: "vermelho" },
  inativo: { rotulo: "Inativo", cor: "cinza" },
};

export const METODOS: Record<string, string> = {
  sumup_cartao: "Cartão (SumUp)",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

export function StatusBadge({ mapa, valor }: { mapa: Record<string, { rotulo: string; cor: string }>; valor: string }) {
  const s = mapa[valor] ?? { rotulo: valor, cor: "cinza" };
  return <Badge cor={s.cor as keyof typeof CORES}>{s.rotulo}</Badge>;
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
export function Botao({
  variante = "primario",
  tamanho = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" | "perigo" | "fantasma"; tamanho?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-bold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed";
  const tam = tamanho === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2.5";
  const cor = {
    primario: "bg-gradient-to-r from-gold-400 to-gold-500 text-navy-950 hover:from-gold-300 hover:to-gold-400 shadow-sm",
    secundario: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    perigo: "bg-red-600 text-white hover:bg-red-700",
    fantasma: "text-slate-600 hover:bg-slate-100",
  }[variante];
  return <button type="button" className={`${base} ${tam} ${cor} ${className}`} {...props} />;
}

export function Card({
  titulo,
  acoes,
  children,
  className = "",
}: {
  titulo?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {(titulo || acoes) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
          <div className="flex items-center gap-2">{acoes}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1">{rotulo}</span>
      {children}
      {dica && <span className="block text-[11px] text-slate-500 mt-1">{dica}</span>}
    </label>
  );
}

export function Alerta({ tipo = "erro", children }: { tipo?: "erro" | "sucesso" | "aviso"; children: React.ReactNode }) {
  const cor = { erro: "bg-red-50 border-red-200 text-red-800", sucesso: "bg-green-50 border-green-200 text-green-800", aviso: "bg-amber-50 border-amber-200 text-amber-900" }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`text-xs rounded-lg border px-3 py-2 ${cor}`}>
      {children}
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="py-12 text-center text-sm text-slate-500">
      <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-slate-200 border-t-navy-900 mb-2" />
      <p>{texto}</p>
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-500">{children}</p>;
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onMouseDown={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`w-full ${largura} bg-white rounded-xl shadow-2xl my-8`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-slate-400 hover:text-slate-700 text-lg leading-none">
            ✕
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Kpi({ rotulo, valor, detalhe, cor = "text-slate-900" }: { rotulo: string; valor: React.ReactNode; detalhe?: string; cor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{rotulo}</div>
      <div className={`text-2xl font-black font-heading mt-1 ${cor}`}>{valor}</div>
      {detalhe && <div className="text-[11px] text-slate-500 mt-0.5">{detalhe}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------
export function useCarregar<T>(url: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(Boolean(url));

  const recarregar = useCallback(async () => {
    if (!url) return;
    setCarregando(true);
    try {
      const { data } = await adminApi.get<T>(url);
      setDados(data);
      setErro("");
    } catch (e) {
      setErro(mensagemErro(e, "Nao foi possivel carregar os dados."));
    } finally {
      setCarregando(false);
    }
  }, [url]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar, setDados };
}

export function Paginacao({ pagina, limite, total, onMudar }: { pagina: number; limite: number; total: number; onMudar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / limite));
  return (
    <div className="flex items-center justify-between text-xs text-slate-600 pt-3">
      <span>{total} registro(s)</span>
      <div className="flex items-center gap-2">
        <Botao variante="secundario" tamanho="sm" disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)}>Anterior</Botao>
        <span>Página {pagina} de {paginas}</span>
        <Botao variante="secundario" tamanho="sm" disabled={pagina >= paginas} onClick={() => onMudar(pagina + 1)}>Próxima</Botao>
      </div>
    </div>
  );
}

export function Tabela({ colunas, children }: { colunas: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            {colunas.map((c) => (
              <th key={c} className="py-2 pr-4 font-bold whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
