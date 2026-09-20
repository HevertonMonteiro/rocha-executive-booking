"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import {
  Alerta, Botao, Campo, Card, Carregando, Kpi, STATUS_PARCEIRO, StatusBadge, Tabela, Vazio,
  dataSistema, dataViagem, eur, inputCls, useCarregar,
} from "@/components/admin/ui";

function primeiroDiaDoMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ParceiroDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { dados: p, erro, carregando, recarregar: recarregarDados } = useCarregar<any>(`/parceiros/${id}`);
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  // --- dados cadastrais ---
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (p) setF({ ...p, site: p.site ?? "", dados_pagamento: p.dados_pagamento ?? "", observacoes_internas: p.observacoes_internas ?? "" }); }, [p]);
  const set = (k: string, v: string) => setF((a: any) => ({ ...a, [k]: v }));

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await adminApi.patch(`/parceiros/${id}`, {
        nome: f.nome, email: f.email, telefone: f.telefone, empresa: f.empresa, cidade: f.cidade, endereco: f.endereco,
        site: f.site || null, dados_pagamento: f.dados_pagamento || null, observacoes_internas: f.observacoes_internas || null, status: f.status,
      });
      setMsg({ tipo: "sucesso", texto: "Dados salvos." });
      recarregarDados();
    } catch (err) { setMsg({ tipo: "erro", texto: mensagemErro(err) }); }
  }

  // --- quanto devo (periodo) ---
  const [inicio, setInicio] = useState(primeiroDiaDoMes());
  const [fim, setFim] = useState("");
  const query = useMemo(() => `/parceiros/${id}/saldo?${new URLSearchParams({ ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) })}`, [id, inicio, fim]);
  const { dados: saldo, carregando: carregandoSaldo, recarregar: recarregarSaldo } = useCarregar<any>(query);
  const { dados: repasses, recarregar: recarregarRepasses } = useCarregar<any[]>(`/parceiros/${id}/repasses`);

  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  useEffect(() => setMarcadas(new Set((saldo?.devidas ?? []).map((c: any) => c.id))), [saldo]);

  const totalMarcado = useMemo(
    () => (saldo?.devidas ?? []).filter((c: any) => marcadas.has(c.id)).reduce((t: number, c: any) => t + Math.round(Number(c.valor_parceiro) * 100), 0) / 100,
    [saldo, marcadas]
  );

  const [metodo, setMetodo] = useState("transferencia");
  const [obs, setObs] = useState("");
  const [pagando, setPagando] = useState(false);

  async function darBaixa() {
    if (!window.confirm(`Confirmar que você pagou ${eur(totalMarcado)} a ${p.nome} por ${marcadas.size} corrida(s)? As corridas serão marcadas como pagas.`)) return;
    setPagando(true);
    setMsg(null);
    try {
      const { data } = await adminApi.post(`/parceiros/${id}/repasses`, {
        reserva_ids: Array.from(marcadas), metodo, observacao: obs || null,
        ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}),
      });
      setMsg({ tipo: "sucesso", texto: `Baixa registrada: ${data.corridas} corrida(s), ${eur(data.valor_total)}.` });
      setObs("");
      recarregarSaldo();
      recarregarRepasses();
    } catch (err) { setMsg({ tipo: "erro", texto: mensagemErro(err) }); } finally { setPagando(false); }
  }

  async function desfazer(repasseId: number) {
    if (!window.confirm("Desfazer este repasse? As corridas voltam a aparecer como 'a pagar'.")) return;
    try {
      await adminApi.post(`/repasses/${repasseId}/desfazer`, {});
      setMsg({ tipo: "sucesso", texto: "Repasse desfeito." });
      recarregarSaldo();
      recarregarRepasses();
    } catch (err) { setMsg({ tipo: "erro", texto: mensagemErro(err) }); }
  }

  if (carregando && !p) return <Carregando />;
  if (erro || !p || !f) return <Alerta>{erro || "Parceiro nao encontrado."}</Alerta>;

  const devidas: any[] = saldo?.devidas ?? [];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/parceiros" className="text-xs font-bold text-slate-500 hover:text-slate-800">← Parceiros</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-black text-slate-900 font-heading">{p.nome}</h1>
          <StatusBadge mapa={STATUS_PARCEIRO} valor={p.status} />
        </div>
        <p className="text-xs text-slate-500">{p.empresa} · cadastro em {dataSistema(p.created_at)}</p>
      </div>
      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}

      {/* ---- Quanto devo ---- */}
      <Card titulo="Quanto devo a este parceiro">
        <div className="grid sm:grid-cols-4 gap-3 items-end mb-4">
          <Campo rotulo="Corridas de"><input type="date" className={inputCls} value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
          <Campo rotulo="até"><input type="date" className={inputCls} value={fim} onChange={(e) => setFim(e.target.value)} /></Campo>
          <Kpi rotulo="Devo (finalizadas)" valor={eur(saldo?.total_devido ?? 0)} cor="text-red-700" />
          <Kpi rotulo="Previsto (confirmadas)" valor={eur(saldo?.total_previsto ?? 0)} detalhe="Ainda não realizadas" />
        </div>

        {carregandoSaldo && !saldo ? <Carregando /> : devidas.length === 0 ? <Vazio>Nenhuma corrida finalizada em aberto neste período.</Vazio> : (
          <>
            <Tabela colunas={["", "Viagem", "Trajeto", "Reserva", "Valor"]}>
              {devidas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2 pr-3"><input type="checkbox" checked={marcadas.has(c.id)} onChange={(e) => setMarcadas((s) => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })} aria-label={`Incluir ${c.codigo}`} /></td>
                  <td className="py-2 pr-3 whitespace-nowrap">{dataViagem(c.data_ida)}</td>
                  <td className="py-2 pr-3">{c.origem} → {c.destino}</td>
                  <td className="py-2 pr-3"><Link className="font-mono text-xs text-blue-700 hover:underline" href={`/admin/reservas/${c.id}`}>{c.codigo}</Link></td>
                  <td className="py-2 font-bold">{eur(c.valor_parceiro)}</td>
                </tr>
              ))}
            </Tabela>
            <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-3 gap-3 items-end">
              <Campo rotulo="Forma do pagamento ao parceiro">
                <select className={inputCls} value={metodo} onChange={(e) => setMetodo(e.target.value)}><option value="transferencia">Transferência</option><option value="dinheiro">Dinheiro</option><option value="outro">Outro</option></select>
              </Campo>
              <Campo rotulo="Observação (opcional)"><input className={inputCls} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: transferência de 15/10" /></Campo>
              <Botao disabled={pagando || marcadas.size === 0} onClick={darBaixa}>Marcar {marcadas.size} corrida(s) como paga(s) · {eur(totalMarcado)}</Botao>
            </div>
            {p.dados_pagamento && <p className="text-xs text-slate-500 mt-3">Dados para pagamento: <span className="font-mono">{p.dados_pagamento}</span></p>}
          </>
        )}
      </Card>

      <Card titulo="Histórico de repasses">
        {!repasses || repasses.length === 0 ? <Vazio>Nenhum repasse realizado.</Vazio> : (
          <Tabela colunas={["Pago em", "Período", "Corridas", "Valor", "Forma", ""]}>
            {repasses.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-4 whitespace-nowrap">{dataSistema(r.pago_em)}</td>
                <td className="py-2 pr-4 text-xs">{r.periodo_inicio || r.periodo_fim ? `${r.periodo_inicio ?? "…"} a ${r.periodo_fim ?? "…"}` : "—"}</td>
                <td className="py-2 pr-4">{r.corridas}</td>
                <td className="py-2 pr-4 font-bold">{eur(r.valor_total)}</td>
                <td className="py-2 pr-4 text-xs">{r.metodo}{r.observacao && <div className="text-slate-500">{r.observacao}</div>}</td>
                <td className="py-2 text-right"><button className="text-[11px] text-red-600 hover:underline" onClick={() => desfazer(r.id)}>desfazer</button></td>
              </tr>
            ))}
          </Tabela>
        )}
      </Card>

      <Card titulo="Dados do parceiro">
        <form onSubmit={salvarDados} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="Nome"><input required className={inputCls} value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
            <Campo rotulo="Empresa"><input required className={inputCls} value={f.empresa} onChange={(e) => set("empresa", e.target.value)} /></Campo>
            <Campo rotulo="E-mail"><input required type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} /></Campo>
            <Campo rotulo="Telefone"><input required className={inputCls} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></Campo>
            <Campo rotulo="Cidade"><input required className={inputCls} value={f.cidade} onChange={(e) => set("cidade", e.target.value)} /></Campo>
            <Campo rotulo="Endereço"><input required className={inputCls} value={f.endereco} onChange={(e) => set("endereco", e.target.value)} /></Campo>
            <Campo rotulo="Site"><input className={inputCls} value={f.site} onChange={(e) => set("site", e.target.value)} /></Campo>
            <Campo rotulo="Situação"><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(STATUS_PARCEIRO).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}</select></Campo>
          </div>
          <Campo rotulo="Dados para pagamento (IBAN)"><input className={inputCls} value={f.dados_pagamento} onChange={(e) => set("dados_pagamento", e.target.value)} /></Campo>
          <Campo rotulo="Observações internas"><textarea rows={2} className={inputCls} value={f.observacoes_internas} onChange={(e) => set("observacoes_internas", e.target.value)} /></Campo>
          <div className="flex justify-end"><Botao type="submit">Salvar dados</Botao></div>
        </form>
      </Card>
    </div>
  );
}
