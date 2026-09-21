"use client";

import { useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Badge, Botao, Campo, Card, Carregando, Tabela, Vazio, dataSistema, inputCls, useCarregar } from "@/components/admin/ui";

interface Eu { email: string; mfa_ativo: boolean; mfa_obrigatorio: boolean; acesso_liberado: boolean }

export default function SegurancaPage() {
  const { dados: eu, recarregar } = useCarregar<Eu>("/me");
  const { dados: auditoria } = useCarregar<any[]>("/auditoria");

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-2xl font-black text-slate-900 font-heading">Segurança da conta</h1>
      {!eu ? <Carregando /> : (
        <>
          {eu.mfa_obrigatorio && !eu.mfa_ativo && (
            <Alerta tipo="aviso">Por segurança, é obrigatório ativar a verificação em duas etapas antes de usar o painel. Configure abaixo.</Alerta>
          )}
          <VerificacaoDuasEtapas eu={eu} onMudou={() => { window.location.href = "/admin/seguranca"; }} recarregar={recarregar} />
          <AlterarSenha />
        </>
      )}

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

function VerificacaoDuasEtapas({ eu, onMudou, recarregar }: { eu: Eu; onMudou: () => void; recarregar: () => void }) {
  const [config, setConfig] = useState<{ qr: string; segredo: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function iniciar() {
    setOcupado(true); setErro("");
    try { const { data } = await adminApi.post("/mfa/iniciar", {}); setConfig(data); }
    catch (e) { setErro(mensagemErro(e)); } finally { setOcupado(false); }
  }
  async function ativar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setErro("");
    try { await adminApi.post("/mfa/ativar", { codigo }); onMudou(); }
    catch (e2) { setErro(mensagemErro(e2)); } finally { setOcupado(false); }
  }
  async function desativar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setErro("");
    try { await adminApi.post("/mfa/desativar", { senha, codigo }); setSenha(""); setCodigo(""); onMudou(); }
    catch (e2) { setErro(mensagemErro(e2)); recarregar(); } finally { setOcupado(false); }
  }

  return (
    <Card titulo="Verificação em duas etapas (aplicativo autenticador)" acoes={<Badge cor={eu.mfa_ativo ? "verde" : "amarelo"}>{eu.mfa_ativo ? "Ativada" : "Desativada"}</Badge>}>
      {eu.mfa_ativo ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Ao entrar, além da senha, é pedido o código de 6 dígitos do seu aplicativo (Google Authenticator, Microsoft Authenticator, 1Password...).</p>
          {eu.mfa_obrigatorio ? (
            <p className="text-xs text-slate-500">Neste ambiente a verificação é obrigatória e não pode ser desativada.</p>
          ) : (
            <form onSubmit={desativar} className="grid sm:grid-cols-3 gap-3 items-end">
              <Campo rotulo="Senha"><input type="password" required className={inputCls} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></Campo>
              <Campo rotulo="Código atual"><input inputMode="numeric" maxLength={6} required className={inputCls} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" /></Campo>
              <Botao type="submit" variante="perigo" disabled={ocupado}>Desativar</Botao>
            </form>
          )}
        </div>
      ) : !config ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Protege sua conta mesmo se a senha vazar. Você vai precisar de um aplicativo autenticador no celular.</p>
          <Botao disabled={ocupado} onClick={iniciar}>Configurar agora</Botao>
        </div>
      ) : (
        <form onSubmit={ativar} className="space-y-4">
          <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
            <li>Abra o aplicativo autenticador e escaneie o QR Code abaixo.</li>
            <li>Digite o código de 6 dígitos que o aplicativo mostrar.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-5">
            <img src={config.qr} alt="QR Code para o aplicativo autenticador" className="w-44 h-44 border border-slate-200 rounded-lg" />
            <div className="space-y-3 flex-1 min-w-[200px]">
              <div className="text-xs text-slate-500">Não consegue escanear? Digite esta chave no aplicativo:<div className="font-mono text-sm text-slate-900 break-all mt-1 select-all">{config.segredo}</div></div>
              <Campo rotulo="Código de 6 dígitos"><input inputMode="numeric" maxLength={6} required autoFocus className={`${inputCls} tracking-[0.4em] text-center font-mono`} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" /></Campo>
              <Botao type="submit" disabled={ocupado}>Ativar verificação</Botao>
            </div>
          </div>
        </form>
      )}
      {erro && <div className="mt-3"><Alerta>{erro}</Alerta></div>}
    </Card>
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
