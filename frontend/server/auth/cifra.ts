import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config, producao } from "../config";

// Cifra dados sensiveis em repouso (ex.: segredo do MFA) com AES-256-GCM.
function chave(): Buffer {
  const bruta = config.chaveCifra;
  if (!bruta) {
    if (producao()) throw new Error("APP_ENCRYPTION_KEY nao configurada.");
    return createHash("sha256").update("chave-somente-para-desenvolvimento").digest();
  }
  const k = Buffer.from(bruta, "base64");
  if (k.length !== 32) throw new Error("APP_ENCRYPTION_KEY deve ter 32 bytes em base64.");
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return ["v1", iv.toString("base64"), cifra.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function decifrar(valor: string): string {
  const [versao, iv, tag, dados] = valor.split(":");
  if (versao !== "v1") throw new Error("Formato de dado cifrado desconhecido.");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}
