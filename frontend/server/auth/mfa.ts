import "server-only";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { cifrar, decifrar } from "./cifra";

const EMISSOR = "Rocha Executive Admin";

export function novoSegredoMfa() {
  return generateSecret();
}

export async function qrCodeMfa(email: string, segredo: string): Promise<{ uri: string; qr: string }> {
  const uri = generateURI({ issuer: EMISSOR, label: email, secret: segredo });
  return { uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

export const cifrarSegredo = cifrar;

/**
 * Valida o codigo de 6 digitos. Devolve o "passo" de tempo usado, que deve ser
 * salvo para impedir a reutilizacao do mesmo codigo (replay).
 */
export function validarCodigoMfa(
  segredoCifrado: string,
  codigo: string,
  ultimoPasso: number | null
): { valido: boolean; passo?: number } {
  if (!/^\d{6}$/.test(codigo)) return { valido: false };
  const resultado = verifySync({ secret: decifrar(segredoCifrado), token: codigo, epochTolerance: 30 });
  if (!resultado.valid) return { valido: false };
  const passo = (resultado as { timeStep?: number }).timeStep;
  if (passo !== undefined && ultimoPasso !== null && passo <= ultimoPasso) return { valido: false };
  return { valido: true, passo };
}

export function validarCodigoComSegredoPuro(segredo: string, codigo: string): boolean {
  return /^\d{6}$/.test(codigo) && verifySync({ secret: segredo, token: codigo, epochTolerance: 30 }).valid;
}
