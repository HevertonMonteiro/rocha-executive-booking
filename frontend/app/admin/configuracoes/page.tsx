"use client";

import { useEffect, useState } from "react";
import { adminApi, mensagemErro } from "@/lib/adminApi";
import { Alerta, Botao, Campo, Card, Carregando, inputCls, useCarregar } from "@/components/admin/ui";

const CAMPOS: { nome: string; rotulo: string; dica?: string; tipo?: string; placeholder?: string }[] = [
  { nome: "empresa_nome", rotulo: "Nome da empresa", dica: "Aparece no rodapé e nos dados do site." },
  { nome: "whatsapp_numero", rotulo: "WhatsApp (somente números, com código do país)", placeholder: "33783078111", dica: "Usado no botão flutuante e nos links de contato. Ex.: 33 + número." },
  { nome: "whatsapp_exibicao", rotulo: "WhatsApp como aparece no site", placeholder: "+33 7 83 07 81 11" },
  { nome: "email_contato", rotulo: "E-mail de contato", tipo: "email" },
  { nome: "endereco", rotulo: "Endereço da empresa" },
  { nome: "siret", rotulo: "SIRET", dica: "Número de registro da empresa na França (exigido nas menções legais)." },
  { nome: "instagram_url", rotulo: "Instagram (link https://)" },
  { nome: "facebook_url", rotulo: "Facebook (link https://)" },
  { nome: "sinal_percentual", rotulo: "Sinal cobrado antecipadamente (%)", tipo: "number", dica: "Mínimo de 20%. É o menor valor que o cliente precisa pagar para concluir a reserva." },
  { nome: "forme_juridique", rotulo: "Forma jurídica", placeholder: "Ex.: SASU, EURL, micro-entrepreneur", dica: "Mentions légales." },
  { nome: "capital_social", rotulo: "Capital social", placeholder: "Ex.: 1 000 €", dica: "Deixe em branco se não se aplica." },
  { nome: "tva_intracom", rotulo: "N.º de IVA intracomunitário", dica: "Deixe em branco se não se aplica." },
  { nome: "directeur_publication", rotulo: "Diretor de publicação", dica: "Nome do responsável pelo conteúdo do site (mentions légales)." },
  { nome: "mediateur_consommation", rotulo: "Mediador de consumo", dica: "Nome e contato do mediador ao qual a empresa aderiu (obrigatório para vender a consumidores na França). Aparece nas condições de venda." },
];

export default function ConfiguracoesPage() {
  const { dados, erro, carregando } = useCarregar<Record<string, string>>("/configuracoes");
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (dados) setF(dados); }, [dados]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const corpo = Object.fromEntries(CAMPOS.map((c) => [c.nome, (f[c.nome] ?? "").trim()]));
      const { data } = await adminApi.put("/configuracoes", corpo);
      setF(data);
      setMsg({ tipo: "sucesso", texto: "Dados salvos. O site já está usando as novas informações." });
    } catch (err) {
      setMsg({ tipo: "erro", texto: mensagemErro(err) });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando && !dados) return <Carregando />;
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 font-heading">Dados da empresa</h1>
        <p className="text-sm text-slate-500 mt-1">Informações usadas em todo o site: contato, WhatsApp, redes sociais e a regra do sinal de pagamento.</p>
      </div>
      {erro && <Alerta>{erro}</Alerta>}
      {["siret", "endereco", "email_contato", "forme_juridique", "directeur_publication"].some((c) => !(f[c] ?? "").trim()) && (
        <Alerta tipo="aviso">
          Para as <strong>menções legais</strong> (obrigatórias na França) preencha: SIRET, endereço, e-mail de contato, forma jurídica e diretor de publicação. Enquanto estiverem vazios, esses campos não aparecem na página pública.
        </Alerta>
      )}
      <Card>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {CAMPOS.map((c) => (
              <Campo key={c.nome} rotulo={c.rotulo} dica={c.dica}>
                <input type={c.tipo ?? "text"} min={c.tipo === "number" ? 20 : undefined} max={c.tipo === "number" ? 99 : undefined} placeholder={c.placeholder} className={inputCls} value={f[c.nome] ?? ""} onChange={(e) => setF({ ...f, [c.nome]: e.target.value })} />
              </Campo>
            ))}
          </div>
          {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
          <div className="flex justify-end"><Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</Botao></div>
        </form>
      </Card>
    </div>
  );
}
