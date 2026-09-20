import { z } from "zod";

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

// "2026-10-01T10:00" ou "2026-10-01T10:00:00" (horario local da viagem)
const dataHora = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "use o formato AAAA-MM-DDTHH:MM")
  .transform((v) => (v.length === 16 ? `${v}:00` : v));

export const schemaNovaReserva = z
  .object({
    origem_id: z.number().int().positive(),
    destino_id: z.number().int().positive(),
    veiculo_id: z.number().int().positive(),
    data_ida: dataHora,
    tipo_trajeto: z.enum(["one_way", "return"]).default("one_way"),
    data_volta: dataHora.optional().nullable(),
    numero_voo: opcional(20),
    numero_voo_volta: opcional(20),
    quantidade_passageiros: z.number().int().min(1).max(20).default(1),
    observacoes: opcional(2000),
    cliente_nome: texto(2, 100),
    cliente_email: z.string().trim().toLowerCase().email().max(100),
    cliente_telefone: texto(8, 20),
    idioma: z.enum(["pt", "en", "fr", "es", "de", "it"]).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.origem_id === d.destino_id) ctx.addIssue({ code: "custom", message: "Origem e destino devem ser diferentes." });
    if (d.tipo_trajeto === "return" && !d.data_volta)
      ctx.addIssue({ code: "custom", path: ["data_volta"], message: "data_volta e obrigatoria para ida e volta." });
    if (d.data_volta && d.data_volta <= d.data_ida)
      ctx.addIssue({ code: "custom", path: ["data_volta"], message: "data_volta deve ser posterior a data_ida." });
  });

export const schemaNovoParceiro = z.object({
  nome: texto(2, 100),
  email: z.string().trim().toLowerCase().email().max(100),
  telefone: texto(8, 20),
  empresa: texto(2, 150),
  cidade: texto(2, 100),
  endereco: texto(3, 200),
  site: opcional(200),
  // Campo isca (honeypot): invisivel para pessoas, preenchido por robos.
  contato_extra: z.string().optional().nullable(),
});

export const schemaCheckout = z.object({
  codigo: z.string().trim().length(10),
  opcao: z.enum(["sinal", "integral"]).default("integral"),
});

export const schemaConsultaRotas = z.object({
  origem_id: z.coerce.number().int().positive(),
  destino_id: z.coerce.number().int().positive(),
  data_ida: dataHora.optional(),
  tipo_trajeto: z.enum(["one_way", "return"]).default("one_way"),
  data_volta: dataHora.optional(),
});
