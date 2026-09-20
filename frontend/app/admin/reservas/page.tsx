"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import {
  Alerta, Botao, Campo, Card, Carregando, Modal, Paginacao, STATUS_PAGAMENTO, STATUS_RESERVA, StatusBadge, Tabela, Vazio,
  dataViagem, eur, inputCls,
} from "@/components/admin/ui";

interface Lista { itens: any[]; total: number; pagina: number; limite: number }

function ListaReservas() {
  const busca = useSearchParams();
  const [filtros, setFiltros] = useState({
    q: "", status: busca.get("status") ?? "", status_pagamento: busca.get("status_pagamento") ?? "",
    sem_parceiro: busca.get("sem_parceiro") ?? "", de: "", ate: "",
  });
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<Lista | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [novaAberta, setNovaAberta] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const params = Object.fromEntries(Object.entries({ ...filtros, pagina }).filter(([, v]) => v !== "" && v !== 0));
        const { data } = await adminApi.get<Lista>("/reservas", { params });
        setLista(data);
        setErro("");
      } catch (e) {
        setErro(mensagemErro(e));
      } finally {
        setCarregando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [filtros, pagina]);

  const mudar = (campo: string, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-900 font-heading">Reservas</h1>
        <Botao onClick={() => setNovaAberta(true)}>+ Nova reserva</Botao>
      </div>

      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <Campo rotulo="Buscar">
              <input className={inputCls} placeholder="Código, nome, e-mail ou telefone" value={filtros.q} onChange={(e) => mudar("q", e.target.value)} />
            </Campo>
          </div>
          <Campo rotulo="Situação">
            <select className={inputCls} value={filtros.status} onChange={(e) => mudar("status", e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(STATUS_RESERVA).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Pagamento">
            <select className={inputCls} value={filtros.status_pagamento} onChange={(e) => mudar("status_pagamento", e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Viagem de">
            <input type="date" className={inputCls} value={filtros.de} onChange={(e) => mudar("de", e.target.value)} />
          </Campo>
          <Campo rotulo="até">
            <input type="date" className={inputCls} value={filtros.ate} onChange={(e) => mudar("ate", e.target.value)} />
          </Campo>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" checked={filtros.sem_parceiro === "1"} onChange={(e) => mudar("sem_parceiro", e.target.checked ? "1" : "")} />
          Somente reservas sem parceiro destinado
        </label>
      </Card>

      <Card>
        {erro && <Alerta>{erro}</Alerta>}
        {carregando && !lista ? <Carregando /> : !lista || lista.itens.length === 0 ? (
          <Vazio>Nenhuma reserva encontrada.</Vazio>
        ) : (
          <>
            <Tabela colunas={["Código", "Viagem", "Trajeto", "Passageiro", "Parceiro", "Total / recebido", "Situação"]}>
              {lista.itens.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 align-top">
                  <td className="py-3 pr-4 font-mono text-xs"><Link href={`/admin/reservas/${r.id}`} className="text-blue-700 font-bold hover:underline">{r.codigo}</Link></td>
                  <td className="py-3 pr-4 whitespace-nowrap">{dataViagem(r.data_ida)}{r.tipo_trajeto === "return" && <div className="text-[11px] text-slate-500">volta {dataViagem(r.data_volta)}</div>}</td>
                  <td className="py-3 pr-4">{r.origem} → {r.destino}<div className="text-[11px] text-slate-500">{r.veiculo} · {r.quantidade_passageiros} pax</div></td>
                  <td className="py-3 pr-4">{r.passageiro_nome}<div className="text-[11px] text-slate-500">{r.passageiro_telefone}</div></td>
                  <td className="py-3 pr-4">{r.parceiro_nome ? <>{r.parceiro_nome}{r.valor_parceiro !== null && <div className="text-[11px] text-slate-500">recebe {eur(r.valor_parceiro)}</div>}</> : <span className="text-red-600 text-xs font-bold">Sem parceiro</span>}</td>
                  <td className="py-3 pr-4 whitespace-nowrap font-medium">{eur(r.preco_total)}<div className="text-[11px] text-slate-500">recebido {eur(r.recebido)}</div></td>
                  <td className="py-3 space-y-1"><StatusBadge mapa={STATUS_RESERVA} valor={r.status} /><br /><StatusBadge mapa={STATUS_PAGAMENTO} valor={r.status_pagamento} /></td>
                </tr>
              ))}
            </Tabela>
            <Paginacao pagina={pagina} limite={lista.limite} total={lista.total} onMudar={setPagina} />
          </>
        )}
      </Card>

      <NovaReserva aberto={novaAberta} onFechar={() => setNovaAberta(false)} />
    </div>
  );
}

// Reserva feita pelo proprio admin (pedido por telefone ou WhatsApp).
function NovaReserva({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [cidades, setCidades] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [f, setF] = useState({ origem_id: "", destino_id: "", veiculo_id: "", data_ida: "", tipo_trajeto: "one_way", data_volta: "", quantidade_passageiros: "1", numero_voo: "", cliente_nome: "", cliente_email: "", cliente_telefone: "", observacoes: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || cidades.length) return;
    adminApi.get("/cidades").then(({ data }) => setCidades(data));
    adminApi.get("/veiculos").then(({ data }) => setVeiculos(data.filter((v: any) => v.ativo)));
  }, [aberto, cidades.length]);

  const set = (k: string, v: string) => setF((a) => ({ ...a, [k]: v }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const { data } = await adminApi.post("/reservas", {
        origem_id: Number(f.origem_id), destino_id: Number(f.destino_id), veiculo_id: Number(f.veiculo_id),
        data_ida: f.data_ida, tipo_trajeto: f.tipo_trajeto, data_volta: f.tipo_trajeto === "return" ? f.data_volta : null,
        quantidade_passageiros: Number(f.quantidade_passageiros), numero_voo: f.numero_voo || null, observacoes: f.observacoes || null,
        cliente_nome: f.cliente_nome, cliente_email: f.cliente_email, cliente_telefone: f.cliente_telefone,
      });
      window.location.href = `/admin/reservas/${data.id}`;
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Nova reserva manual" onFechar={onFechar} largura="max-w-2xl">
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Origem"><select required className={inputCls} value={f.origem_id} onChange={(e) => set("origem_id", e.target.value)}><option value="">Selecione</option>{cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
          <Campo rotulo="Destino"><select required className={inputCls} value={f.destino_id} onChange={(e) => set("destino_id", e.target.value)}><option value="">Selecione</option>{cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
          <Campo rotulo="Veículo"><select required className={inputCls} value={f.veiculo_id} onChange={(e) => set("veiculo_id", e.target.value)}><option value="">Selecione</option>{veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} (até {v.capacidade_passageiros})</option>)}</select></Campo>
          <Campo rotulo="Passageiros"><input required type="number" min={1} max={20} className={inputCls} value={f.quantidade_passageiros} onChange={(e) => set("quantidade_passageiros", e.target.value)} /></Campo>
          <Campo rotulo="Trajeto"><select className={inputCls} value={f.tipo_trajeto} onChange={(e) => set("tipo_trajeto", e.target.value)}><option value="one_way">Só ida</option><option value="return">Ida e volta</option></select></Campo>
          <Campo rotulo="Nº do voo (opcional)"><input className={inputCls} maxLength={20} value={f.numero_voo} onChange={(e) => set("numero_voo", e.target.value)} /></Campo>
          <Campo rotulo="Data e hora da ida"><input required type="datetime-local" className={inputCls} value={f.data_ida} onChange={(e) => set("data_ida", e.target.value)} /></Campo>
          {f.tipo_trajeto === "return" && <Campo rotulo="Data e hora da volta"><input required type="datetime-local" className={inputCls} value={f.data_volta} onChange={(e) => set("data_volta", e.target.value)} /></Campo>}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <Campo rotulo="Nome do cliente"><input required minLength={2} className={inputCls} value={f.cliente_nome} onChange={(e) => set("cliente_nome", e.target.value)} /></Campo>
          <Campo rotulo="E-mail"><input required type="email" className={inputCls} value={f.cliente_email} onChange={(e) => set("cliente_email", e.target.value)} /></Campo>
          <Campo rotulo="Telefone"><input required minLength={8} className={inputCls} value={f.cliente_telefone} onChange={(e) => set("cliente_telefone", e.target.value)} /></Campo>
        </div>
        <Campo rotulo="Observações"><textarea rows={2} className={inputCls} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Criar reserva"}</Botao>
        </div>
      </form>
    </Modal>
  );
}

export default function ReservasPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <ListaReservas />
    </Suspense>
  );
}
