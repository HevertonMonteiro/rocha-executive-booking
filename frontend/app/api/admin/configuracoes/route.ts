import { z } from "zod";
import { consulta, transacao } from "@/server/db/client";
import { comAdmin, ErroHttp, lerCorpo } from "@/server/http";
import { CHAVES_PERMITIDAS, SINAL_MINIMO, lerConfiguracoes } from "@/server/servicos/configuracoes";

export const dynamic = "force-dynamic";

export const GET = comAdmin(() => lerConfiguracoes());

const url = z.string().trim().max(300).refine((v) => v === "" || v.startsWith("https://"), "use um link https://");

const schema = z
  .object({
    empresa_nome: z.string().trim().min(1).max(120),
    whatsapp_numero: z.string().trim().regex(/^\d{8,15}$/, "somente digitos com DDI, ex.: 33783078111"),
    whatsapp_exibicao: z.string().trim().max(30),
    email_contato: z.string().trim().max(120).refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "e-mail invalido"),
    endereco: z.string().trim().max(300),
    siret: z.string().trim().max(30),
    instagram_url: url,
    facebook_url: url,
    sinal_percentual: z.string().trim().regex(/^\d{2}$/).refine((v) => Number(v) >= SINAL_MINIMO && Number(v) <= 99, `entre ${SINAL_MINIMO} e 99 (o sinal minimo e ${SINAL_MINIMO}%)`),
    forme_juridique: z.string().trim().max(60),
    capital_social: z.string().trim().max(60),
    tva_intracom: z.string().trim().max(30),
    directeur_publication: z.string().trim().max(100),
    mediateur_consommation: z.string().trim().max(400),
  })
  .partial()
  .strict();

export const PUT = comAdmin(async ({ req }) => {
  const d = (await lerCorpo(req, schema)) as Record<string, string>;
  const chaves = Object.keys(d).filter((c) => CHAVES_PERMITIDAS.has(c));
  if (!chaves.length) throw new ErroHttp(422, "Nenhuma configuracao valida enviada.");
  await transacao(async (tx) => {
    for (const chave of chaves) {
      await tx.query(
        "insert into configuracoes (chave, valor) values ($1, $2) on conflict (chave) do update set valor = excluded.valor",
        [chave, d[chave]]
      );
    }
  });
  return lerConfiguracoes();
});
