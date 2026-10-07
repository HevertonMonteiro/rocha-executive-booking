"use client";

import { useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Badge, Botao, Campo, Card, Carregando, Tabela, Vazio, dataSistema, inputCls, useCarregar } from "@/components/admin/ui";

export default function SegurancaPage() {
  const { dados: auditoria } = useCarregar<any[]>("/auditoria");

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-2xl font-black text-slate-900 font-heading">Segurança da conta</h1>
      <AlterarSenha />

      <Card titulo="Atividade recente no painel (últimas 200 ações)">
        {!auditoria ? <Carregando /> : auditoria.length === 0 ? <Vazio>Sem registros.</Vazio> : (
          <div className="max-h-96 overflow-y-auto">
            <Tabela colunas={["Quando", "Quem", "Ação", "Resultado", "IP"]}>
              {auditoria.map((a) => (
                <tr key={a.id}>
                  <td className="py-1.5 pr-3 text-xs whitespace-nowrap">{dataSistema(a.criado_em)}</td>
                  <td className="py-1.5 pr-3 text-xs">{a.admin_email ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-xs font-mono break-all">{a.acao}</td>
                  <td className="py-1.5 pr-3"><Badge cor={a.status_http && a.status_http < 400 ? "verde" : "vermelho"}>{a.status_http}</Badge></td>
                  <td className="py-1.5 text-xs font-mono">{a.ip}</td>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
      </Card>
    </div>
  );
}

function AlterarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== confirma) return setMsg({ tipo: "erro", texto: "A confirmação não confere com a nova senha." });
    setOcupado(true); setMsg(null);
    try {
      await adminApi.post("/senha", { senha_atual: atual, nova_senha: nova });
      setAtual(""); setNova(""); setConfirma("");
      setMsg({ tipo: "sucesso", texto: "Senha alterada. Os outros aparelhos conectados foram desconectados." });
    } catch (err) { setMsg({ tipo: "erro", texto: mensagemErro(err) }); } finally { setOcupado(false); }
  }

  return (
    <Card titulo="Alterar senha">
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Campo rotulo="Senha atual"><input type="password" required className={inputCls} value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" /></Campo>
          <Campo rotulo="Nova senha" dica="Entre 8 e 16 caracteres, misturando 3 tipos (maiúsculas, minúsculas, números, símbolos)."><input type="password" required minLength={8} maxLength={16} className={inputCls} value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" /></Campo>
          <Campo rotulo="Repita a nova senha"><input type="password" required maxLength={16} className={inputCls} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" /></Campo>
        </div>
        {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
        <div className="flex justify-end"><Botao type="submit" disabled={ocupado}>Alterar senha</Botao></div>
      </form>
    </Card>
  );
}
