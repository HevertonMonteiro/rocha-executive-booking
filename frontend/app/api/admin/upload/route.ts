import { config } from "@/server/config";
import { comAdmin, ErroHttp, limitar } from "@/server/http";
import { salvarImagem } from "@/server/servicos/storage";

export const dynamic = "force-dynamic";

export const POST = comAdmin(async ({ req, admin }) => {
  await limitar(`upload:${admin.id}`, 30, 600);
  // Recusa antes de ler o corpo inteiro quando ja e grande demais.
  const tamanho = Number(req.headers.get("content-length") ?? 0);
  if (tamanho > config.uploadMaxBytes + 100_000) throw new ErroHttp(413, "Arquivo muito grande.");

  const form = await req.formData().catch(() => {
    throw new ErroHttp(400, "Envio invalido.");
  });
  const arquivo = form.get("arquivo");
  const pasta = form.get("pasta");
  if (!(arquivo instanceof File)) throw new ErroHttp(400, "Nenhum arquivo enviado.");
  if (pasta !== "frota" && pasta !== "destinos") throw new ErroHttp(400, "Pasta invalida.");
  return { url: await salvarImagem(arquivo, pasta) };
});
