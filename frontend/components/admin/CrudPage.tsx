"use client";

import { useEffect, useMemo, useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Botao, Campo, Card, Carregando, Modal, Tabela, Vazio, inputCls } from "./ui";

type Opcao = { valor: string | number; rotulo: string };

export interface CampoCrud {
  nome: string;
  rotulo: string;
  tipo: "texto" | "numero" | "select" | "checkbox" | "textarea" | "imagem";
  opcoes?: Opcao[];
  opcoesDe?: string;
  numerico?: boolean; // select cujo valor e numero
  dica?: string;
  passo?: string;
  nulo?: boolean; // vazio vira null
  pasta?: "frota" | "destinos";
  mostrarSe?: (form: Record<string, any>) => boolean;
  aoMudar?: (valor: any, form: Record<string, any>, criando: boolean) => Record<string, any>;
}

export interface ColunaCrud {
  titulo: string;
  render: (linha: any, acoes: { alternarAtivo?: () => void }) => React.ReactNode;
}

export interface FonteOpcoes {
  endpoint: string;
  valor: string;
  rotulo: (linha: any) => string;
}

interface Props {
  titulo: string;
  descricao?: string;
  endpoint: string;
  nomeItem: string;
  campos: CampoCrud[];
  colunas: ColunaCrud[];
  inicial: Record<string, any>;
  fontes?: Record<string, FonteOpcoes>;
  busca?: (linha: any) => string;
  rodapeForm?: (form: Record<string, any>, fontes: Record<string, any[]>) => React.ReactNode;
  secundario?: boolean;
}

export default function CrudPage(p: Props) {
  const [linhas, setLinhas] = useState<any[] | null>(null);
  const [fontesDados, setFontesDados] = useState<Record<string, any[]>>({});
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<{ id: number | null; form: Record<string, any> } | null>(null);

  async function carregar() {
    try {
      const { data } = await adminApi.get(p.endpoint);
      setLinhas(data);
      setErro("");
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  useEffect(() => {
    carregar();
    Object.entries(p.fontes ?? {}).forEach(([chave, f]) =>
      adminApi.get(f.endpoint).then(({ data }) => setFontesDados((d) => ({ ...d, [chave]: data })))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiveis = useMemo(() => {
    if (!linhas) return [];
    const termo = filtro.trim().toLowerCase();
    return p.busca && termo ? linhas.filter((l) => p.busca!(l).toLowerCase().includes(termo)) : linhas;
  }, [linhas, filtro, p]);

  function abrirNovo() {
    setEditando({ id: null, form: { ...p.inicial } });
    setMsg("");
  }
  function abrirEdicao(linha: any) {
    const form: Record<string, any> = {};
    p.campos.forEach((c) => (form[c.nome] = linha[c.nome] ?? (c.tipo === "checkbox" ? false : "")));
    setEditando({ id: linha.id, form });
    setMsg("");
  }

  async function alternarAtivo(linha: any) {
    try {
      await adminApi.patch(`${p.endpoint}/${linha.id}`, { ativo: !linha.ativo });
      carregar();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  async function excluir(linha: any) {
    if (!window.confirm(`Excluir este ${p.nomeItem}? Se estiver em uso, desative em vez de excluir.`)) return;
    try {
      await adminApi.delete(`${p.endpoint}/${linha.id}`);
      setMsg(`${p.nomeItem} excluído.`);
      carregar();
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {p.secundario ? <h2 className="text-lg font-black text-slate-900 font-heading">{p.titulo}</h2> : <h1 className="text-2xl font-black text-slate-900 font-heading">{p.titulo}</h1>}
          {p.descricao && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{p.descricao}</p>}
        </div>
        <Botao onClick={abrirNovo}>+ Adicionar</Botao>
      </div>

      {msg && <Alerta tipo="sucesso">{msg}</Alerta>}
      {erro && <Alerta>{erro}</Alerta>}

      <Card>
        {p.busca && <div className="mb-4 max-w-sm"><input className={inputCls} placeholder="Filtrar..." value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>}
        {!linhas ? <Carregando /> : visiveis.length === 0 ? <Vazio>Nada cadastrado.</Vazio> : (
          <Tabela colunas={[...p.colunas.map((c) => c.titulo), ""]}>
            {visiveis.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 align-middle">
                {p.colunas.map((c) => (
                  <td key={c.titulo} className="py-2.5 pr-4">{c.render(l, { alternarAtivo: "ativo" in l ? () => alternarAtivo(l) : undefined })}</td>
                ))}
                <td className="py-2.5 text-right whitespace-nowrap space-x-1">
                  <Botao tamanho="sm" variante="secundario" onClick={() => abrirEdicao(l)}>Editar</Botao>
                  <Botao tamanho="sm" variante="fantasma" onClick={() => excluir(l)}>Excluir</Botao>
                </td>
              </tr>
            ))}
          </Tabela>
        )}
      </Card>

      {editando && (
        <Formulario
          {...p}
          editando={editando}
          fontesDados={fontesDados}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            setMsg(`${p.nomeItem} salvo.`);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function Formulario(p: Props & { editando: { id: number | null; form: Record<string, any> }; fontesDados: Record<string, any[]>; onFechar: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState(p.editando.form);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const criando = p.editando.id === null;

  const opcoesDe = (c: CampoCrud): Opcao[] => {
    if (c.opcoes) return c.opcoes;
    const fonte = c.opcoesDe ? p.fontes?.[c.opcoesDe] : undefined;
    return fonte ? (p.fontesDados[c.opcoesDe!] ?? []).map((l) => ({ valor: l[fonte.valor], rotulo: fonte.rotulo(l) })) : [];
  };

  function mudar(c: CampoCrud, valor: any) {
    setForm((atual) => ({ ...atual, [c.nome]: valor, ...(c.aoMudar ? c.aoMudar(valor, atual, criando) : {}) }));
  }

  async function enviarArquivo(c: CampoCrud, arquivo: File) {
    setEnviando(true);
    setErro("");
    try {
      const dados = new FormData();
      dados.append("arquivo", arquivo);
      dados.append("pasta", c.pasta ?? "frota");
      const { data } = await adminApi.post("/upload", dados);
      mudar(c, data.url);
    } catch (e) {
      setErro(mensagemErro(e, "Nao foi possivel enviar a imagem."));
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const corpo: Record<string, any> = {};
    for (const c of p.campos) {
      if (c.mostrarSe && !c.mostrarSe(form)) continue;
      const v = form[c.nome];
      if (c.tipo === "checkbox") corpo[c.nome] = Boolean(v);
      else if (c.tipo === "numero") corpo[c.nome] = v === "" || v === null ? (c.nulo ? null : 0) : Number(v);
      else if (c.tipo === "select" && c.numerico) corpo[c.nome] = v === "" ? null : Number(v);
      else corpo[c.nome] = v === "" && c.nulo ? null : v;
    }
    try {
      if (criando) await adminApi.post(p.endpoint, corpo);
      else await adminApi.patch(`${p.endpoint}/${p.editando.id}`, corpo);
      p.onSalvo();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo={`${criando ? "Novo" : "Editar"} ${p.nomeItem}`} onFechar={p.onFechar} largura="max-w-2xl">
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {p.campos.filter((c) => !c.mostrarSe || c.mostrarSe(form)).map((c) => {
            const largo = c.tipo === "textarea" || c.tipo === "imagem";
            return (
              <div key={c.nome} className={largo ? "sm:col-span-2" : ""}>
                {c.tipo === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer pt-6">
                    <input type="checkbox" checked={Boolean(form[c.nome])} onChange={(e) => mudar(c, e.target.checked)} />
                    {c.rotulo}
                  </label>
                ) : c.tipo === "imagem" ? (
                  <Campo rotulo={c.rotulo} dica={c.dica ?? "JPG, PNG ou WebP, até 5 MB."}>
                    <div className="flex items-center gap-3">
                      {form[c.nome] ? <img src={form[c.nome]} alt="Pré-visualização" className="w-28 h-20 object-cover rounded-lg border border-slate-200" /> : <div className="w-28 h-20 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] text-slate-400">sem foto</div>}
                      <div className="space-y-1.5">
                        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={enviando} onChange={(e) => e.target.files?.[0] && enviarArquivo(c, e.target.files[0])} className="text-xs" />
                        {enviando && <div className="text-[11px] text-slate-500">Enviando...</div>}
                        {form[c.nome] && <button type="button" className="text-[11px] text-red-600 hover:underline" onClick={() => mudar(c, "")}>remover foto</button>}
                      </div>
                    </div>
                  </Campo>
                ) : (
                  <Campo rotulo={c.rotulo} dica={c.dica}>
                    {c.tipo === "select" ? (
                      <select required className={inputCls} value={form[c.nome] ?? ""} onChange={(e) => mudar(c, e.target.value)}>
                        <option value="">Selecione</option>
                        {opcoesDe(c).map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                      </select>
                    ) : c.tipo === "textarea" ? (
                      <textarea rows={3} className={inputCls} value={form[c.nome] ?? ""} onChange={(e) => mudar(c, e.target.value)} />
                    ) : (
                      <input
                        required={!c.nulo}
                        type={c.tipo === "numero" ? "number" : "text"}
                        step={c.tipo === "numero" ? c.passo ?? "0.01" : undefined}
                        min={c.tipo === "numero" ? 0 : undefined}
                        className={inputCls}
                        value={form[c.nome] ?? ""}
                        onChange={(e) => mudar(c, e.target.value)}
                      />
                    )}
                  </Campo>
                )}
              </div>
            );
          })}
        </div>
        {p.rodapeForm?.(form, p.fontesDados)}
        {erro && <Alerta>{erro}</Alerta>}
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={p.onFechar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando || enviando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
        </div>
      </form>
    </Modal>
  );
}
