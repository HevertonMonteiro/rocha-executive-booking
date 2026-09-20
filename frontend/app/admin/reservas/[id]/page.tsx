"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi, codigoErro, mensagemErro } from "@/lib/adminApi";
import {
  Alerta, Badge, Botao, Campo, Card, Carregando, METODOS, Modal, STATUS_PAGAMENTO, STATUS_RESERVA, StatusBadge, Tabela,
  dataSistema, dataViagem, eur, inputCls, paraInputDataHora, useCarregar,
} from "@/components/admin/ui";

export default function ReservaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { dados: r, erro, carregando, recarregar } = useCarregar<any>(`/reservas/${id}`);
  const { dados: parceiros } = useCarregar<any[]>("/parceiros?status=aprovado");
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso" | "aviso"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pagando, setPagando] = useState(false);

  const [parceiroId, setParceiroId] = useState("");
  const [valorParceiro, setValorParceiro] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (r) {
      setParceiroId(r.parceiro_id ? String(r.parceiro_id) : "");
      setValorParceiro(r.valor_parceiro !== null && r.valor_parceiro !== undefined ? String(r.valor_parceiro) : "");
      setNotas(r.notas_internas ?? "");
    }
  }, [r]);

  if (carregando && !r) return <Carregando />;
  if (erro || !r) return <Alerta>{erro || "Reserva nao encontrada."}</Alerta>;

  async function acao(fn: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tipo: "sucesso", texto: sucesso });
      await recarregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: mensagemErro(e) });
    } finally {
      setOcupado(false);
    }
  }

  const ativa = r.status === "pendente" || r.status === "confirmado";
  const travadaRepasse = Boolean(r.repasse_id);

  async function destinar() {
    setOcupado(true);
    setMsg(null);
    try {
      const { data } = await adminApi.post(`/reservas/${id}/parceiro`, {
        parceiro_id: parceiroId ? Number(parceiroId) : null,
        valor_parceiro: valorParceiro === "" ? null : Number(valorParceiro),
      });
      setMsg(
        data.conflitos?.length
          ? { tipo: "aviso", texto: `Parceiro destinado, mas ele já tem viagem(ns) no mesmo horário: ${data.conflitos.join(", ")}.` }
          : { tipo: "sucesso", texto: parceiroId ? "Parceiro destinado." : "Parceiro removido." }
      );
      await recarregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: mensagemErro(e) });
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(permitir = false) {
    setOcupado(true);
    setMsg(null);
    try {
      await adminApi.post(`/reservas/${id}/confirmar`, permitir ? { permitir_sem_pagamento: true } : {});
      setMsg({ tipo: "sucesso", texto: "Viagem confirmada." });
      await recarregar();
    } catch (e) {
      if (codigoErro(e) === "SEM_PAGAMENTO" && window.confirm("Nenhum pagamento foi recebido ainda. Confirmar a viagem mesmo assim?")) {
        setOcupado(false);
        return confirmar(true);
      }
      setMsg({ tipo: "erro", texto: mensagemErro(e) });
    } finally {
      setOcupado(false);
    }
  }

  const etapas = [
    { rotulo: "Recebida", ok: true },
    { rotulo: "Pagamento", ok: r.status_pagamento !== "pendente", detalhe: STATUS_PAGAMENTO[r.status_pagamento]?.rotulo },
    { rotulo: "Parceiro", ok: Boolean(r.parceiro_id), detalhe: r.parceiro_nome },
    { rotulo: "Confirmada", ok: ["confirmado", "finalizado"].includes(r.status) },
    { rotulo: "Finalizada", ok: r.status === "finalizado" },
    { rotulo: "Repasse pago", ok: travadaRepasse },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/reservas" className="text-xs font-bold text-slate-500 hover:text-slate-800">← Reservas</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-black text-slate-900 font-heading font-mono">{r.codigo}</h1>
          <StatusBadge mapa={STATUS_RESERVA} valor={r.status} />
          <StatusBadge mapa={STATUS_PAGAMENTO} valor={r.status_pagamento} />
        </div>
        <p className="text-xs text-slate-500 mt-1">Criada em {dataSistema(r.created_at)}</p>
      </div>

      {r.status === "cancelado" ? (
        <Alerta tipo="aviso">Esta reserva foi cancelada. Se houver valor recebido, o estorno ao cliente é feito manualmente na SumUp.</Alerta>
      ) : (
        <ol className="flex flex-wrap gap-2">
          {etapas.map((e, i) => (
            <li key={e.rotulo} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${e.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-white border-slate-200 text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${e.ok ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}>{e.ok ? "✓" : i + 1}</span>
              {e.rotulo}{e.detalhe && e.ok ? ` · ${e.detalhe}` : ""}
            </li>
          ))}
        </ol>
      )}

      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}

      {ativa && (
        <div className="flex flex-wrap gap-2">
          {r.status === "pendente" && <Botao disabled={ocupado} onClick={() => confirmar()}>Confirmar viagem</Botao>}
          {r.status === "confirmado" && (
            <Botao disabled={ocupado} onClick={() => window.confirm("Marcar esta viagem como realizada (finalizada)?") && acao(() => adminApi.post(`/reservas/${id}/finalizar`, {}), "Viagem finalizada.")}>
              Marcar como finalizada
            </Botao>
          )}
          <Botao variante="secundario" onClick={() => setEditando(true)}>Editar / remarcar</Botao>
          <Botao
            variante="perigo"
            disabled={ocupado}
            onClick={async () => {
              if (!window.confirm("Cancelar esta reserva? O horário do veículo será liberado.")) return;
              setOcupado(true);
              try {
                const { data } = await adminApi.post(`/reservas/${id}/cancelar`, {});
                setMsg(Number(data.valor_a_estornar) > 0
                  ? { tipo: "aviso", texto: `Reserva cancelada. Estorne ${eur(data.valor_a_estornar)} ao cliente pela SumUp.` }
                  : { tipo: "sucesso", texto: "Reserva cancelada." });
                await recarregar();
              } catch (e) { setMsg({ tipo: "erro", texto: mensagemErro(e) }); } finally { setOcupado(false); }
            }}
          >
            Cancelar reserva
          </Botao>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card titulo="Viagem">
          <dl className="grid grid-cols-3 gap-y-2.5 text-sm">
            <dt className="text-slate-500">Trajeto</dt><dd className="col-span-2 font-medium">{r.origem} → {r.destino}</dd>
            <dt className="text-slate-500">Ida</dt><dd className="col-span-2 font-medium">{dataViagem(r.data_ida)}</dd>
            {r.tipo_trajeto === "return" && (<><dt className="text-slate-500">Volta</dt><dd className="col-span-2 font-medium">{dataViagem(r.data_volta)}</dd></>)}
            <dt className="text-slate-500">Veículo</dt><dd className="col-span-2 font-medium">{r.veiculo}</dd>
            <dt className="text-slate-500">Passageiros</dt><dd className="col-span-2 font-medium">{r.quantidade_passageiros}</dd>
            <dt className="text-slate-500">Nº do voo</dt><dd className="col-span-2 font-medium">{r.numero_voo || "—"}{r.numero_voo_volta ? ` / volta ${r.numero_voo_volta}` : ""}</dd>
            <dt className="text-slate-500">Observações</dt><dd className="col-span-2 whitespace-pre-line">{r.observacoes || "—"}</dd>
          </dl>
        </Card>

        <Card titulo="Passageiro / cliente">
          <dl className="grid grid-cols-3 gap-y-2.5 text-sm">
            <dt className="text-slate-500">Nome</dt><dd className="col-span-2 font-medium">{r.passageiro_nome}</dd>
            <dt className="text-slate-500">Telefone</dt>
            <dd className="col-span-2 font-medium">
              {r.passageiro_telefone}{" "}
              <a className="text-xs text-green-700 font-bold hover:underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${String(r.passageiro_telefone).replace(/\D/g, "")}`}>WhatsApp</a>
            </dd>
            <dt className="text-slate-500">E-mail</dt><dd className="col-span-2 font-medium break-all">{r.cliente_email}</dd>
            <dt className="text-slate-500">Cadastro</dt><dd className="col-span-2"><Link className="text-blue-700 text-xs font-bold hover:underline" href={`/admin/clientes?q=${encodeURIComponent(r.cliente_email)}`}>Ver cliente e histórico</Link></dd>
          </dl>
        </Card>

        <Card titulo="Parceiro da viagem">
          {travadaRepasse && <Alerta tipo="sucesso">Corrida já paga ao parceiro (repasse #{r.repasse_id}).</Alerta>}
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <Campo rotulo="Parceiro">
              <select className={inputCls} disabled={!ativa || travadaRepasse} value={parceiroId} onChange={(e) => setParceiroId(e.target.value)}>
                <option value="">— Sem parceiro —</option>
                {(parceiros ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}{p.empresa ? ` · ${p.empresa}` : ""}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Valor a pagar ao parceiro (€)" dica="Quanto ele recebe por esta corrida.">
              <input type="number" min={0} step="0.01" className={inputCls} disabled={!ativa || travadaRepasse} value={valorParceiro} onChange={(e) => setValorParceiro(e.target.value)} />
            </Campo>
          </div>
          {ativa && !travadaRepasse && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {r.valor_parceiro !== null && Number(r.preco_total) > 0 && <>Margem estimada: <strong>{eur(Number(r.preco_total) - Number(r.valor_parceiro))}</strong></>}
              </span>
              <Botao disabled={ocupado} onClick={destinar}>{r.parceiro_id ? "Salvar parceiro" : "Destinar parceiro"}</Botao>
            </div>
          )}
          {(parceiros ?? []).length === 0 && <p className="text-xs text-amber-700 mt-2">Nenhum parceiro aprovado. <Link className="font-bold underline" href="/admin/parceiros">Aprove ou cadastre parceiros</Link>.</p>}
        </Card>

        <Card titulo="Pagamentos" acoes={r.financeiro.saldo !== "0.00" && r.status !== "cancelado" ? <Botao tamanho="sm" onClick={() => setPagando(true)}>+ Registrar pagamento</Botao> : undefined}>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-[10px] uppercase font-bold text-slate-500">Total</div><div className="font-black">{eur(r.financeiro.total)}</div></div>
            <div className="bg-green-50 rounded-lg p-3"><div className="text-[10px] uppercase font-bold text-green-700">Recebido</div><div className="font-black text-green-800">{eur(r.financeiro.recebido)}</div></div>
            <div className="bg-amber-50 rounded-lg p-3"><div className="text-[10px] uppercase font-bold text-amber-700">Saldo</div><div className="font-black text-amber-800">{eur(r.financeiro.saldo)}</div></div>
          </div>
          {r.pagamentos.length === 0 ? <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p> : (
            <Tabela colunas={["Data", "Forma", "Valor", ""]}>
              {r.pagamentos.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs">{dataSistema(p.pago_em)}</td>
                  <td className="py-2 pr-3 text-xs">{METODOS[p.metodo] ?? p.metodo}{p.tipo && <> · {p.tipo}</>}{p.origem === "sumup" && <Badge cor="azul">automático</Badge>}{p.observacao && <div className="text-[11px] text-amber-700">{p.observacao}</div>}</td>
                  <td className="py-2 pr-3 font-bold">{eur(p.valor)}</td>
                  <td className="py-2 text-right">{p.origem === "manual" && <button className="text-[11px] text-red-600 hover:underline" onClick={() => window.confirm("Remover este lançamento manual?") && acao(() => adminApi.delete(`/reservas/${id}/pagamentos/${p.id}`), "Lançamento removido.")}>remover</button>}</td>
                </tr>
              ))}
            </Tabela>
          )}
          {r.checkouts.some((c: any) => c.status === "pendente") && (
            <p className="text-[11px] text-slate-500 mt-3">Há {r.checkouts.filter((c: any) => c.status === "pendente").length} tentativa(s) de pagamento na SumUp ainda não concluída(s). Quando o cliente pagar, o valor entra aqui automaticamente.</p>
          )}
        </Card>
      </div>

      <Card titulo="Notas internas" acoes={<Botao tamanho="sm" disabled={ocupado || notas === (r.notas_internas ?? "")} onClick={() => acao(() => adminApi.patch(`/reservas/${id}`, { notas_internas: notas || null }), "Notas salvas.")}>Salvar notas</Botao>}>
        <textarea rows={3} className={inputCls} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Visível apenas para você. Ex.: cliente pediu cadeirinha, combinar acerto em dinheiro..." />
      </Card>

      <EditarReserva aberto={editando} r={r} onFechar={() => setEditando(false)} onSalvo={() => { setEditando(false); setMsg({ tipo: "sucesso", texto: "Reserva atualizada." }); recarregar(); }} />
      <NovoPagamento aberto={pagando} id={id} saldo={r.financeiro.saldo} onFechar={() => setPagando(false)} onSalvo={() => { setPagando(false); setMsg({ tipo: "sucesso", texto: "Pagamento registrado." }); recarregar(); }} />
    </div>
  );
}

function EditarReserva({ aberto, r, onFechar, onSalvo }: { aberto: boolean; r: any; onFechar: () => void; onSalvo: () => void }) {
  const [f, setF] = useState<any>({});
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (aberto) {
      setF({ data_ida: paraInputDataHora(r.data_ida), data_volta: paraInputDataHora(r.data_volta), numero_voo: r.numero_voo ?? "", passageiro_nome: r.passageiro_nome, passageiro_telefone: r.passageiro_telefone, quantidade_passageiros: String(r.quantidade_passageiros) });
      setErro("");
    }
  }, [aberto, r]);
  const set = (k: string, v: string) => setF((a: any) => ({ ...a, [k]: v }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await adminApi.patch(`/reservas/${r.id}`, {
        data_ida: f.data_ida, ...(r.tipo_trajeto === "return" ? { data_volta: f.data_volta } : {}),
        numero_voo: f.numero_voo || null, passageiro_nome: f.passageiro_nome, passageiro_telefone: f.passageiro_telefone,
        quantidade_passageiros: Number(f.quantidade_passageiros),
      });
      onSalvo();
    } catch (err) { setErro(mensagemErro(err)); } finally { setSalvando(false); }
  }

  return (
    <Modal aberto={aberto} titulo="Editar / remarcar reserva" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-slate-500">Ao mudar a data, o sistema confere se o veículo está livre no novo horário.</p>
        <Campo rotulo="Data e hora da ida"><input required type="datetime-local" className={inputCls} value={f.data_ida ?? ""} onChange={(e) => set("data_ida", e.target.value)} /></Campo>
        {r.tipo_trajeto === "return" && <Campo rotulo="Data e hora da volta"><input required type="datetime-local" className={inputCls} value={f.data_volta ?? ""} onChange={(e) => set("data_volta", e.target.value)} /></Campo>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Nome do passageiro"><input required className={inputCls} value={f.passageiro_nome ?? ""} onChange={(e) => set("passageiro_nome", e.target.value)} /></Campo>
          <Campo rotulo="Telefone"><input required className={inputCls} value={f.passageiro_telefone ?? ""} onChange={(e) => set("passageiro_telefone", e.target.value)} /></Campo>
          <Campo rotulo="Passageiros"><input required type="number" min={1} max={20} className={inputCls} value={f.quantidade_passageiros ?? ""} onChange={(e) => set("quantidade_passageiros", e.target.value)} /></Campo>
          <Campo rotulo="Nº do voo"><input className={inputCls} maxLength={20} value={f.numero_voo ?? ""} onChange={(e) => set("numero_voo", e.target.value)} /></Campo>
        </div>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2"><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao></div>
      </form>
    </Modal>
  );
}

function NovoPagamento({ aberto, id, saldo, onFechar, onSalvo }: { aberto: boolean; id: string; saldo: string; onFechar: () => void; onSalvo: () => void }) {
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (aberto) { setValor(saldo); setMetodo("dinheiro"); setObs(""); setErro(""); } }, [aberto, saldo]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await adminApi.post(`/reservas/${id}/pagamentos`, { valor: Number(valor), metodo, observacao: obs || null });
      onSalvo();
    } catch (err) { setErro(mensagemErro(err)); } finally { setSalvando(false); }
  }
  return (
    <Modal aberto={aberto} titulo="Registrar pagamento recebido" onFechar={onFechar} largura="max-w-md">
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-slate-500">Use para valores recebidos fora do site (dinheiro, transferência, maquininha). Pagamentos do cartão pelo site entram sozinhos.</p>
        <Campo rotulo="Valor (€)" dica={`Saldo em aberto: ${eur(saldo)}`}><input required type="number" min={0.01} step="0.01" max={Number(saldo)} className={inputCls} value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo rotulo="Forma de pagamento"><select className={inputCls} value={metodo} onChange={(e) => setMetodo(e.target.value)}>{Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
        <Campo rotulo="Observação (opcional)"><input className={inputCls} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2"><Botao variante="secundario" onClick={onFechar}>Cancelar</Botao><Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Registrar"}</Botao></div>
      </form>
    </Modal>
  );
}
