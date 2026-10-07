import "server-only";
import { config } from "../config";
import { consulta } from "../db/client";
import { paraCentavos } from "../dinheiro";
import { dataViagemLocal, localeDe } from "../../lib/i18n";
import type { Language } from "../../lib/translations";
import { lerConfiguracoes } from "./configuracoes";
import { emailConfigurado, enviarEmail, esc } from "./email";

// Textos do e-mail de confirmacao para o cliente, no idioma escolhido no site.
const TEXTOS = {
  pt: {
    assunto: "Reserva confirmada — {codigo}", ola: "Olá {nome},", recebido: "Recebemos seu pagamento de {valor}. Sua reserva está garantida.",
    detalhes: "Detalhes da reserva", codigo: "Código", trajeto: "Trajeto", ida: "Ida", volta: "Volta", veiculo: "Veículo",
    passageiros: "Passageiros", voo: "Voo", total: "Total", pago: "Pago", saldo: "Saldo a pagar", pagarSaldo: "Pagar o saldo",
    quitado: "Reserva totalmente paga.", contato: "Dúvidas ou alterações: fale conosco pelo WhatsApp {whatsapp}.", fim: "Até breve,",
  },
  en: {
    assunto: "Booking confirmed — {codigo}", ola: "Hello {nome},", recebido: "We have received your payment of {valor}. Your booking is secured.",
    detalhes: "Booking details", codigo: "Reference", trajeto: "Route", ida: "Outbound", volta: "Return", veiculo: "Vehicle",
    passageiros: "Passengers", voo: "Flight", total: "Total", pago: "Paid", saldo: "Balance due", pagarSaldo: "Pay the balance",
    quitado: "Booking fully paid.", contato: "Questions or changes: contact us on WhatsApp {whatsapp}.", fim: "See you soon,",
  },
  fr: {
    assunto: "Réservation confirmée — {codigo}", ola: "Bonjour {nome},", recebido: "Nous avons bien reçu votre paiement de {valor}. Votre réservation est garantie.",
    detalhes: "Détails de la réservation", codigo: "Référence", trajeto: "Trajet", ida: "Aller", volta: "Retour", veiculo: "Véhicule",
    passageiros: "Passagers", voo: "Vol", total: "Total", pago: "Payé", saldo: "Reste à payer", pagarSaldo: "Payer le solde",
    quitado: "Réservation entièrement payée.", contato: "Questions ou modifications : contactez-nous sur WhatsApp au {whatsapp}.", fim: "À bientôt,",
  },
  es: {
    assunto: "Reserva confirmada — {codigo}", ola: "Hola {nome}:", recebido: "Hemos recibido su pago de {valor}. Su reserva está garantizada.",
    detalhes: "Detalles de la reserva", codigo: "Código", trajeto: "Trayecto", ida: "Ida", volta: "Vuelta", veiculo: "Vehículo",
    passageiros: "Pasajeros", voo: "Vuelo", total: "Total", pago: "Pagado", saldo: "Saldo pendiente", pagarSaldo: "Pagar el saldo",
    quitado: "Reserva pagada en su totalidad.", contato: "Dudas o cambios: contáctenos por WhatsApp al {whatsapp}.", fim: "Hasta pronto,",
  },
  de: {
    assunto: "Buchung bestätigt — {codigo}", ola: "Hallo {nome},", recebido: "Wir haben Ihre Zahlung über {valor} erhalten. Ihre Buchung ist gesichert.",
    detalhes: "Buchungsdetails", codigo: "Buchungsnummer", trajeto: "Strecke", ida: "Hinfahrt", volta: "Rückfahrt", veiculo: "Fahrzeug",
    passageiros: "Fahrgäste", voo: "Flug", total: "Gesamt", pago: "Bezahlt", saldo: "Restbetrag", pagarSaldo: "Restbetrag bezahlen",
    quitado: "Buchung vollständig bezahlt.", contato: "Fragen oder Änderungen: kontaktieren Sie uns per WhatsApp unter {whatsapp}.", fim: "Bis bald,",
  },
  it: {
    assunto: "Prenotazione confermata — {codigo}", ola: "Gentile {nome},", recebido: "Abbiamo ricevuto il suo pagamento di {valor}. La sua prenotazione è garantita.",
    detalhes: "Dettagli della prenotazione", codigo: "Codice", trajeto: "Tragitto", ida: "Andata", volta: "Ritorno", veiculo: "Veicolo",
    passageiros: "Passeggeri", voo: "Volo", total: "Totale", pago: "Pagato", saldo: "Saldo da pagare", pagarSaldo: "Paga il saldo",
    quitado: "Prenotazione interamente pagata.", contato: "Domande o modifiche: ci contatti su WhatsApp al {whatsapp}.", fim: "A presto,",
  },
} satisfies Record<Language, Record<string, string>>;

const idiomaValido = (v: string | null | undefined): Language => (v && v in TEXTOS ? (v as Language) : "fr");
const preencher = (texto: string, valores: Record<string, string>) => texto.replace(/\{(\w+)\}/g, (_, k) => valores[k] ?? "");
const euros = (centavos: number, lang: Language) =>
  new Intl.NumberFormat(localeDe(lang), { style: "currency", currency: "EUR" }).format(centavos / 100);

/** Tabela "rotulo: valor" usada nos dois tipos de e-mail (HTML + texto puro). */
function montar(titulo: string, paragrafos: string[], linhas: [string, string][], rodape: string[], botao?: { texto: string; url: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0f172a;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">${esc(titulo)}</div>
<div style="background:#fff;padding:24px;border-radius:0 0 12px 12px">
${paragrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${esc(p)}</p>`).join("")}
<table style="width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:14px">
${linhas.map(([r, v]) => `<tr><td style="padding:7px 0;color:#71717a;border-bottom:1px solid #f4f4f5">${esc(r)}</td><td style="padding:7px 0;text-align:right;font-weight:bold;border-bottom:1px solid #f4f4f5">${esc(v)}</td></tr>`).join("")}
</table>
${botao ? `<p style="margin:0 0 18px"><a href="${esc(botao.url)}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(botao.texto)}</a></p>` : ""}
${rodape.map((p) => `<p style="margin:0 0 6px;line-height:1.5;color:#52525b;font-size:14px">${esc(p)}</p>`).join("")}
</div></div></body></html>`;
  const texto = [
    titulo,
    "",
    ...paragrafos,
    "",
    ...linhas.map(([r, v]) => `${r}: ${v}`),
    ...(botao ? ["", `${botao.texto}: ${botao.url}`] : []),
    "",
    ...rodape,
  ].join("\n");
  return { html, texto };
}

interface DadosReservaEmail {
  id: number;
  codigo: string;
  passageiro_nome: string;
  passageiro_telefone: string;
  cliente_email: string;
  idioma_preferido: string | null;
  origem: string;
  destino: string;
  veiculo: string;
  tipo_trajeto: string;
  data_ida: string;
  data_volta: string | null;
  numero_voo: string | null;
  quantidade_passageiros: number;
  preco_total: string;
  recebido: string;
}

async function carregarReserva(reservaId: number): Promise<DadosReservaEmail | undefined> {
  const [r] = await consulta<DadosReservaEmail>(
    `select r.id, r.codigo, r.passageiro_nome, r.passageiro_telefone, c.email as cliente_email, c.idioma_preferido,
            co.nome as origem, cd.nome as destino, v.nome as veiculo, r.tipo_trajeto,
            r.data_ida::text as data_ida, r.data_volta::text as data_volta, r.numero_voo, r.quantidade_passageiros, r.preco_total,
            coalesce((select sum(p.valor) from pagamentos p where p.reserva_id = r.id), 0) as recebido
       from reservas r
       join clientes c on c.id = r.cliente_id
       join rotas ro on ro.id = r.rota_id
       join cidades co on co.id = ro.origem_id
       join cidades cd on cd.id = ro.destino_id
       join veiculos v on v.id = r.veiculo_id
      where r.id = $1`,
    [reservaId]
  );
  return r;
}

/**
 * Pagamento online confirmado: envia a confirmacao ao cliente (no idioma dele) e
 * avisa a empresa. Nunca lanca erro — o pagamento ja esta registrado.
 */
export async function notificarPagamentoConfirmado(reservaId: number, valorCentavos: number): Promise<void> {
  if (!emailConfigurado()) return;
  try {
    const r = await carregarReserva(reservaId);
    if (!r) return;
    const empresa = await lerConfiguracoes(true);
    const nomeEmpresa = empresa.empresa_nome || "Rocha Executive Transport";
    const lang = idiomaValido(r.idioma_preferido);
    const t = TEXTOS[lang];
    const totalC = paraCentavos(r.preco_total);
    const saldoC = Math.max(0, totalC - paraCentavos(r.recebido));
    const trajeto = `${r.origem} → ${r.destino}`;

    const linhas: [string, string][] = [
      [t.codigo, r.codigo],
      [t.trajeto, trajeto],
      [t.ida, dataViagemLocal(r.data_ida, lang)],
      ...(r.data_volta ? [[t.volta, dataViagemLocal(r.data_volta, lang)] as [string, string]] : []),
      ...(r.numero_voo ? [[t.voo, r.numero_voo] as [string, string]] : []),
      [t.veiculo, r.veiculo],
      [t.passageiros, String(r.quantidade_passageiros)],
      [t.total, euros(totalC, lang)],
      [t.pago, euros(totalC - saldoC, lang)],
      ...(saldoC > 0 ? [[t.saldo, euros(saldoC, lang)] as [string, string]] : []),
    ];
    const rodape = [
      ...(saldoC > 0 ? [] : [t.quitado]),
      ...(empresa.whatsapp_exibicao ? [preencher(t.contato, { whatsapp: empresa.whatsapp_exibicao })] : []),
      t.fim,
      nomeEmpresa,
    ];
    const cliente = montar(
      nomeEmpresa,
      [preencher(t.ola, { nome: r.passageiro_nome }), preencher(t.recebido, { valor: euros(valorCentavos, lang) })],
      linhas,
      rodape,
      saldoC > 0 ? { texto: t.pagarSaldo, url: `${config.siteUrl}/reserva/pagar?codigo=${r.codigo}` } : undefined
    );

    const avisos: Promise<boolean>[] = [
      enviarEmail({
        para: r.cliente_email,
        assunto: preencher(t.assunto, { codigo: r.codigo }),
        ...cliente,
        responderPara: empresa.email_contato || null,
      }),
    ];
    if (empresa.email_contato) {
      const interno = montar(
        `Pagamento recebido — ${r.codigo}`,
        [`${r.passageiro_nome} pagou ${euros(valorCentavos, "pt")} pelo site (SumUp).`],
        [
          ["Cliente", r.passageiro_nome],
          ["Telefone", r.passageiro_telefone],
          ["E-mail", r.cliente_email],
          ["Trajeto", trajeto],
          ["Ida", dataViagemLocal(r.data_ida, "pt")],
          ...(r.data_volta ? [["Volta", dataViagemLocal(r.data_volta, "pt")] as [string, string]] : []),
          ["Veículo", r.veiculo],
          ["Total", euros(totalC, "pt")],
          ["Saldo a receber", euros(saldoC, "pt")],
        ],
        [],
        { texto: "Abrir no painel", url: `${config.siteUrl}/admin/reservas/${r.id}` }
      );
      avisos.push(enviarEmail({ para: empresa.email_contato, assunto: `Pagamento recebido — ${r.codigo} (${trajeto})`, ...interno }));
    }
    await Promise.all(avisos);
  } catch (e) {
    console.error("[notificacoes] pagamento", e instanceof Error ? e.message : e);
  }
}

export interface DadosOrcamentoEmail {
  origem_texto: string;
  destino_texto: string;
  tipo_trajeto: string;
  data_ida: string;
  data_volta?: string | null;
  quantidade_passageiros: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email?: string | null;
  observacoes?: string | null;
}

/** Novo pedido de orcamento: avisa a empresa para responder rapido (WhatsApp/telefone). */
export async function notificarNovoOrcamento(o: DadosOrcamentoEmail): Promise<void> {
  if (!emailConfigurado()) return;
  try {
    const empresa = await lerConfiguracoes(true);
    if (!empresa.email_contato) return;
    const trajeto = `${o.origem_texto} → ${o.destino_texto}`;
    const corpo = montar(
      "Novo pedido de orçamento",
      [`${o.cliente_nome} pediu um orçamento para um trajeto sem preço cadastrado.`],
      [
        ["Cliente", o.cliente_nome],
        ["Telefone", o.cliente_telefone],
        ...(o.cliente_email ? [["E-mail", o.cliente_email] as [string, string]] : []),
        ["Trajeto", trajeto],
        ["Ida", dataViagemLocal(o.data_ida, "pt")],
        ...(o.tipo_trajeto === "return" && o.data_volta ? [["Volta", dataViagemLocal(o.data_volta, "pt")] as [string, string]] : []),
        ["Passageiros", String(o.quantidade_passageiros)],
        ...(o.observacoes ? [["Observações", o.observacoes] as [string, string]] : []),
      ],
      [],
      { texto: "Abrir no painel", url: `${config.siteUrl}/admin/orcamentos` }
    );
    await enviarEmail({
      para: empresa.email_contato,
      assunto: `Novo pedido de orçamento — ${trajeto}`,
      ...corpo,
      responderPara: o.cliente_email || null,
    });
  } catch (e) {
    console.error("[notificacoes] orcamento", e instanceof Error ? e.message : e);
  }
}
