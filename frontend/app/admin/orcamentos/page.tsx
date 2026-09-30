"use client";

import { useEffect, useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import {
  Alerta, Botao, Campo, Card, Carregando, Modal, Paginacao, STATUS_ORCAMENTO, StatusBadge, Tabela, Vazio, dataViagem, dataSistema, inputCls,
} from "@/components/admin/ui";

interface Orcamento {
  id: number;
  origem_texto: string;
  origem_cadastrada: string | null;
  destino_texto: string;
  destino_cadastrado: string | null;
  tipo_trajeto: string;
  data_ida: string;
  data_volta: string | null;
  quantidade_passageiros: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string | null;
  observacoes: string | null;
  status: string;
  notas_internas: string | null;
  created_at: string;
}
interface Lista { itens: Orcamento[]; total: number; pagina: number; limite: number }

function local(o: { origem_cadastrada: string | null; origem_texto: string }) {
  return o.origem_cadastrada ?? o.origem_texto;
}
function localDestino(o: { destino_cadastrado: string | null; destino_texto: string }) {
  return o.destino_cadastrado ?? o.destino_texto;
}

export default function OrcamentosPage() {
  const [status, setStatus] = useState("pendente");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<Lista | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Orcamento | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const params = Object.fromEntries(Object.entries({ status, q, pagina }).filter(([, v]) => v !== "" && v !== 0));
      const { data } = await adminApi.get<Lista>("/orcamentos", { params });
      setLista(data);
      setErro("");
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, pagina]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-900 font-heading">Solicitações de Orçamento</h1>
      </div>
      <p className="text-sm text-slate-600 -mt-3">
        Pedidos de clientes com origem e/ou destino fora dos cadastrados (sem preço fixo automático). Responda por telefone/WhatsApp e
        registre o resultado aqui.
      </p>

      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2">
            <Campo rotulo="Buscar">
              <input className={inputCls} placeholder="Nome, telefone, origem ou destino" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
            </Campo>
          </div>
          <Campo rotulo="Situação">
            <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }}>
              <option value="">Todas</option>
              {Object.entries(STATUS_ORCAMENTO).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </Campo>
        </div>
      </Card>

      <Card>
        {erro && <Alerta>{erro}</Alerta>}
        {carregando && !lista ? <Carregando /> : !lista || lista.itens.length === 0 ? (
          <Vazio>Nenhuma solicitação encontrada.</Vazio>
        ) : (
          <>
            <Tabela colunas={["Pedido em", "Viagem", "Trajeto", "Cliente", "Status", ""]}>
              {lista.itens.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-xs">{dataSistema(o.created_at)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{dataViagem(o.data_ida)}{o.tipo_trajeto === "return" && <div className="text-[11px] text-slate-500">volta {dataViagem(o.data_volta)}</div>}</td>
                  <td className="py-3 pr-4">
                    {local(o)}{!o.origem_cadastrada && <span className="ml-1 text-[10px] font-bold text-amber-600 uppercase">novo</span>} →{" "}
                    {localDestino(o)}{!o.destino_cadastrado && <span className="ml-1 text-[10px] font-bold text-amber-600 uppercase">novo</span>}
                    <div className="text-[11px] text-slate-500">{o.quantidade_passageiros} pax</div>
                  </td>
                  <td className="py-3 pr-4">{o.cliente_nome}<div className="text-[11px] text-slate-500">{o.cliente_telefone}</div></td>
                  <td className="py-3 pr-4"><StatusBadge mapa={STATUS_ORCAMENTO} valor={o.status} /></td>
                  <td className="py-3"><Botao tamanho="sm" variante="secundario" onClick={() => setAberto(o)}>Ver</Botao></td>
                </tr>
              ))}
            </Tabela>
            <Paginacao pagina={pagina} limite={lista.limite} total={lista.total} onMudar={setPagina} />
          </>
        )}
      </Card>

      {aberto && (
        <DetalheOrcamento
          orcamento={aberto}
          onFechar={() => setAberto(null)}
          onAtualizado={() => { setAberto(null); carregar(); }}
        />
      )}
    </div>
  );
}

function DetalheOrcamento({ orcamento, onFechar, onAtualizado }: { orcamento: Orcamento; onFechar: () => void; onAtualizado: () => void }) {
  const [notas, setNotas] = useState(orcamento.notas_internas ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function atualizar(status?: string) {
    setSalvando(true);
    setErro("");
    try {
      await adminApi.patch(`/orcamentos/${orcamento.id}`, { status, notas_internas: notas || null });
      onAtualizado();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo={`Pedido de ${orcamento.cliente_nome}`} onFechar={onFechar} largura="max-w-xl">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs font-bold text-slate-500">Origem</span>
            {local(orcamento)}
            {!orcamento.origem_cadastrada && <span className="ml-1 text-[10px] font-bold text-amber-600 uppercase">não cadastrada</span>}
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500">Destino</span>
            {localDestino(orcamento)}
            {!orcamento.destino_cadastrado && <span className="ml-1 text-[10px] font-bold text-amber-600 uppercase">não cadastrado</span>}
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500">Ida</span>
            {dataViagem(orcamento.data_ida)}
          </div>
          {orcamento.tipo_trajeto === "return" && (
            <div>
              <span className="block text-xs font-bold text-slate-500">Volta</span>
              {dataViagem(orcamento.data_volta)}
            </div>
          )}
          <div>
            <span className="block text-xs font-bold text-slate-500">Passageiros</span>
            {orcamento.quantidade_passageiros}
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500">Telefone</span>
            <a className="text-blue-700 hover:underline" href={`https://wa.me/${orcamento.cliente_telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
              {orcamento.cliente_telefone}
            </a>
          </div>
          {orcamento.cliente_email && (
            <div>
              <span className="block text-xs font-bold text-slate-500">E-mail</span>
              {orcamento.cliente_email}
            </div>
          )}
        </div>

        {orcamento.observacoes && (
          <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="block text-xs font-bold text-slate-500 mb-1">Observações do cliente</span>
            {orcamento.observacoes}
          </div>
        )}

        <Campo rotulo="Notas internas (só o painel vê)">
          <textarea rows={3} className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: valor combinado, quando foi contatado..." />
        </Campo>

        {erro && <Alerta>{erro}</Alerta>}

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
          <Botao variante="secundario" disabled={salvando} onClick={() => atualizar()}>Salvar notas</Botao>
          {orcamento.status !== "descartado" && (
            <Botao variante="perigo" disabled={salvando} onClick={() => atualizar("descartado")}>Descartar</Botao>
          )}
          {orcamento.status !== "respondido" && (
            <Botao disabled={salvando} onClick={() => atualizar("respondido")}>Marcar como respondido</Botao>
          )}
        </div>
      </div>
    </Modal>
  );
}
