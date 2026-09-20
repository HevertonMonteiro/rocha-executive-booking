import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import { ErroHttp } from "../http";

const TIPOS: Record<string, { ext: string; confere: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", confere: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": {
    ext: "webp",
    confere: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

/**
 * Valida e grava uma imagem. Confere o tipo pelo CONTEUDO (assinatura do
 * arquivo), nao pelo nome ou pelo Content-Type enviado pelo navegador; usa
 * nome aleatorio e limita o tamanho.
 */
export async function salvarImagem(arquivo: File, pasta: "frota" | "destinos"): Promise<string> {
  if (arquivo.size === 0) throw new ErroHttp(422, "Arquivo vazio.");
  if (arquivo.size > config.uploadMaxBytes) throw new ErroHttp(413, `A imagem deve ter no maximo ${config.uploadMaxBytes / 1024 / 1024} MB.`);

  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const tipo = Object.entries(TIPOS).find(([, t]) => t.confere(conteudo));
  if (!tipo) throw new ErroHttp(422, "Formato invalido. Envie uma imagem JPG, PNG ou WebP.");
  const [mime, { ext }] = tipo;
  const nome = `${pasta}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  if (config.driverStorage === "supabase") {
    const { url, serviceRoleKey, bucket } = config.supabase;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await supabase.storage.from(bucket).upload(nome, conteudo, { contentType: mime, upsert: false });
    if (error) {
      console.error("[storage] falha no upload", error.message);
      throw new ErroHttp(502, "Nao foi possivel enviar a imagem.");
    }
    return `${url}/storage/v1/object/public/${bucket}/${nome}`;
  }

  // Desenvolvimento local: grava em public/uploads (o disco da Netlify e somente leitura).
  const destino = path.join(process.cwd(), "public", "uploads", nome);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, conteudo);
  return `/uploads/${nome}`;
}
