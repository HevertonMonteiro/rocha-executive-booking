import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt com parametros da recomendacao OWASP (N=2^14, r=8, p=5 ~ 16 MiB).
const N = 2 ** 14;
const R = 8;
const P = 5;
const TAMANHO = 64;
export const SENHA_MIN = 8;
export const SENHA_MAX = 16;

function derivar(senha: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(senha.normalize("NFKC"), salt, TAMANHO, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (erro, chave) =>
      erro ? reject(erro) : resolve(chave)
    )
  );
}

export function validarForcaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) {
    return `A senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres.`;
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(senha)).length;
  if (classes < 3) return "Use letras maiusculas, minusculas, numeros e/ou simbolos (pelo menos 3 tipos).";
  return null;
}

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const chave = await derivar(senha, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${chave.toString("base64")}`;
}

// Hash valido usado quando o e-mail nao existe: gasta o mesmo tempo e evita
// descobrir quais e-mails sao administradores pelo tempo de resposta.
let hashFalso: Promise<string> | null = null;

export async function verificarSenha(senha: string, armazenado: string | null): Promise<boolean> {
  hashFalso ??= hashSenha("senha-descartavel-para-tempo-constante");
  const alvo = armazenado ?? (await hashFalso);
  try {
    const [, n, r, p, saltB64, hashB64] = alvo.split("$");
    const esperado = Buffer.from(hashB64, "base64");
    const calculado = await derivar(senha, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
    return timingSafeEqual(calculado, esperado) && armazenado !== null;
  } catch {
    return false;
  }
}
