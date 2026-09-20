"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Botao, Campo, Card, Carregando, Modal, Paginacao, STATUS_PAGAMENTO, STATUS_RESERVA, StatusBadge, Tabela, Vazio, dataSistema, dataViagem, eur, inputCls } from "@/components/admin/ui";

function ListaClientes() {
  const [q, setQ] = useState(useSearchParams().get("q") ?? "");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const { data } = await adminApi.get("/clientes", { params: { ...(q ? { q } : {}), pagina } });
        setLista(data);
        setErro("");
      } catch (e) { setErro(mensagemErro(e)); } finally { setCarregando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, pagina]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-900 font-heading">Clientes</h1>
      <Card><Campo rotulo="Buscar"><input className={inputCls} placeholder="Nome, e-mail ou telefone" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></Campo></Card>
      <Card>
        {erro && <Alerta>{erro}</Alerta>}
        {carregando && !lista ? <Carregando /> : !lista || lista.itens.length === 0 ? <Vazio>Nenhum cliente encontrado.</Vazio> : (
          <>
            <Tabela colunas={["Cliente", "Contato", "Reservas", "Total pago", "Última viagem", "Desde"]}>
              {lista.itens.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4"><button className="font-bold text-blue-700 hover:underline text-left" onClick={() => setAberto(c.id)}>{c.nome}</button></td>
                  <td className="py-3 pr-4 text-xs">{c.telefone}<div className="text-slate-500 break-all">{c.email}</div></td>
                  <td className="py-3 pr-4">{c.reservas_ativas}<span className="text-xs text-slate-500"> / {c.reservas}</span></td>
                  <td className="py-3 pr-4 font-medium">{eur(c.total_pago)}</td>
                  <td className="py-3 pr-4 text-xs whitespace-nowrap">{dataViagem(c.ultima_viagem)}</td>
                  <td className="py-3 text-xs whitespace-nowrap">{dataSistema(c.created_at)}</td>
                </tr>
              ))}
            </Tabela>
            <Paginacao pagina={pagina} limite={lista.limite} total={lista.total} onMudar={setPagina} />
          </>
        )}
      </Card>
      <ClienteModal id={aberto} onFechar={() => setAberto(null)} />
    </div>
  );
}

function ClienteModal({ id, onFechar }: { id: number | null; onFechar: () => void }) {
  const [c, setC] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!id) return;
    setC(null); setErro(""); setMsg("");
    adminApi.get(`/clientes/${id}`).then(({ data }) => setC(data)).catch((e) => setErro(mensagemErro(e)));
  }, [id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg("");
    try {
      await adminApi.patch(`/clientes/${id}`, { nome: c.nome, email: c.email, telefone: c.telefone });
      setMsg("Dados salvos.");
    } catch (err) { setErro(mensagemErro(err)); }
  }
  async function excluir() {
    if (!window.confirm("Excluir este cliente definitivamente? (Só é possível se não houver reservas.)")) return;
    try { await adminApi.delete(`/clientes/${id}`); window.location.reload(); } catch (err) { setErro(mensagemErro(err)); }
  }

  return (
    <Modal aberto={id !== null} titulo="Cliente" onFechar={onFechar} largura="max-w-3xl">
      {!c ? (erro ? <Alerta>{erro}</Alerta> : <Carregando />) : (
        <div className="space-y-5">
          <form onSubmit={salvar} className="grid sm:grid-cols-3 gap-3 items-end">
            <Campo rotulo="Nome"><input required className={inputCls} value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /></Campo>
            <Campo rotulo="E-mail"><input required type="email" className={inputCls} value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></Campo>
            <Campo rotulo="Telefone"><input required className={inputCls} value={c.telefone} onChange={(e) => setC({ ...c, telefone: e.target.value })} /></Campo>
            <div className="sm:col-span-3 flex items-center justify-between">
              <Botao variante="fantasma" tamanho="sm" onClick={excluir}>Excluir cliente</Botao>
              <Botao type="submit">Salvar</Botao>
            </div>
          </form>
          {erro && <Alerta>{erro}</Alerta>}
          {msg && <Alerta tipo="sucesso">{msg}</Alerta>}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Histórico de reservas ({c.reservas.length})</h3>
            {c.reservas.length === 0 ? <Vazio>Sem reservas.</Vazio> : (
              <Tabela colunas={["Código", "Viagem", "Trajeto", "Total", "Situação"]}>
                {c.reservas.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-mono text-xs"><Link className="text-blue-700 font-bold hover:underline" href={`/admin/reservas/${r.id}`}>{r.codigo}</Link></td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs">{dataViagem(r.data_ida)}</td>
                    <td className="py-2 pr-3 text-xs">{r.origem} → {r.destino}</td>
                    <td className="py-2 pr-3 text-xs">{eur(r.preco_total)}</td>
                    <td className="py-2"><StatusBadge mapa={STATUS_RESERVA} valor={r.status} /> <StatusBadge mapa={STATUS_PAGAMENTO} valor={r.status_pagamento} /></td>
                  </tr>
                ))}
              </Tabela>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ClientesPage() {
  return <Suspense fallback={<Carregando />}><ListaClientes /></Suspense>;
}
