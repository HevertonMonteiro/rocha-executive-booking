"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Botao, Campo, Card, Carregando, Modal, STATUS_PARCEIRO, StatusBadge, Tabela, Vazio, dataSistema, eur, inputCls, useCarregar } from "@/components/admin/ui";

const ABAS = [
  { valor: "pendente", rotulo: "Solicitações" },
  { valor: "aprovado", rotulo: "Aprovados" },
  { valor: "", rotulo: "Todos" },
];

function ListaParceiros() {
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "aprovado");
  const { dados, erro, carregando, recarregar } = useCarregar<any[]>(`/parceiros${status ? `?status=${status}` : ""}`);
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [novo, setNovo] = useState(false);

  async function mudarStatus(id: number, novoStatus: string, texto: string) {
    setMsg(null);
    try {
      await adminApi.patch(`/parceiros/${id}`, { status: novoStatus });
      setMsg({ tipo: "sucesso", texto });
      recarregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: mensagemErro(e) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-900 font-heading">Parceiros</h1>
        <Botao onClick={() => setNovo(true)}>+ Novo parceiro</Botao>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map((a) => (
          <button key={a.rotulo} type="button" onClick={() => setStatus(a.valor)} className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition ${status === a.valor ? "border-gold-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
      <Card>
        {erro && <Alerta>{erro}</Alerta>}
        {carregando && !dados ? <Carregando /> : !dados || dados.length === 0 ? (
          <Vazio>{status === "pendente" ? "Nenhuma solicitação aguardando análise." : "Nenhum parceiro encontrado."}</Vazio>
        ) : (
          <Tabela colunas={["Parceiro", "Contato", "Cidade", "Situação", "A pagar", "Previsto", ""]}>
            {dados.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 align-top">
                <td className="py-3 pr-4"><Link href={`/admin/parceiros/${p.id}`} className="font-bold text-blue-700 hover:underline">{p.nome}</Link><div className="text-[11px] text-slate-500">{p.empresa}</div><div className="text-[11px] text-slate-400">solicitou em {dataSistema(p.created_at)}</div></td>
                <td className="py-3 pr-4 text-xs">{p.telefone}<div className="text-slate-500 break-all">{p.email}</div></td>
                <td className="py-3 pr-4 text-xs">{p.cidade}</td>
                <td className="py-3 pr-4"><StatusBadge mapa={STATUS_PARCEIRO} valor={p.status} /></td>
                <td className="py-3 pr-4 font-bold whitespace-nowrap">{Number(p.a_pagar) > 0 ? <span className="text-red-700">{eur(p.a_pagar)}</span> : eur(0)}</td>
                <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{eur(p.previsto)}</td>
                <td className="py-3 text-right whitespace-nowrap space-x-1">
                  {p.status === "pendente" && (<>
                    <Botao tamanho="sm" onClick={() => mudarStatus(p.id, "aprovado", `${p.nome} aprovado.`)}>Aprovar</Botao>
                    <Botao tamanho="sm" variante="secundario" onClick={() => window.confirm(`Recusar a solicitação de ${p.nome}?`) && mudarStatus(p.id, "recusado", "Solicitação recusada.")}>Recusar</Botao>
                  </>)}
                  {p.status === "aprovado" && <Botao tamanho="sm" variante="fantasma" onClick={() => window.confirm(`Marcar ${p.nome} como inativo? Ele deixa de receber viagens, o histórico é mantido.`) && mudarStatus(p.id, "inativo", "Parceiro marcado como inativo.")}>Inativar</Botao>}
                  {(p.status === "inativo" || p.status === "recusado") && <Botao tamanho="sm" variante="secundario" onClick={() => mudarStatus(p.id, "aprovado", "Parceiro aprovado.")}>Reativar</Botao>}
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Card>
      <NovoParceiro aberto={novo} onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); setStatus("aprovado"); recarregar(); }} />
    </div>
  );
}

function NovoParceiro({ aberto, onFechar, onSalvo }: { aberto: boolean; onFechar: () => void; onSalvo: () => void }) {
  const [f, setF] = useState({ nome: "", email: "", telefone: "", empresa: "", cidade: "", endereco: "", site: "", dados_pagamento: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: string, v: string) => setF((a) => ({ ...a, [k]: v }));
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await adminApi.post("/parceiros", { ...f, site: f.site || null, dados_pagamento: f.dados_pagamento || null });
      setF({ nome: "", email: "", telefone: "", empresa: "", cidade: "", endereco: "", site: "", dados_pagamento: "" });
      onSalvo();
    } catch (err) { setErro(mensagemErro(err)); } finally { setSalvando(false); }
  }
  return (
    <Modal aberto={aberto} titulo="Novo parceiro (já aprovado)" onFechar={onFechar} largura="max-w-2xl">
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Nome completo"><input required minLength={2} className={inputCls} value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
          <Campo rotulo="Empresa"><input required minLength={2} className={inputCls} value={f.empresa} onChange={(e) => set("empresa", e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><input required type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} /></Campo>
          <Campo rotulo="Telefone"><input required minLength={8} className={inputCls} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></Campo>
          <Campo rotulo="Cidade"><input required minLength={2} className={inputCls} value={f.cidade} onChange={(e) => set("cidade", e.target.value)} /></Campo>
          <Campo rotulo="Endereço"><input required minLength={3} className={inputCls} value={f.endereco} onChange={(e) => set("endereco", e.target.value)} /></Campo>
          <Campo rotulo="Site (opcional)"><input className={inputCls} value={f.site} onChange={(e) => set("site", e.target.value)} /></Campo>
          <Campo rotulo="Dados para pagamento (IBAN)" dica="Usado nos repasses."><input className={inputCls} value={f.dados_pagamento} onChange={(e) => set("dados_pagamento", e.target.value)} /></Campo>
        </div>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2"><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar"}</Botao></div>
      </form>
    </Modal>
  );
}

export default function ParceirosPage() {
  return <Suspense fallback={<Carregando />}><ListaParceiros /></Suspense>;
}
