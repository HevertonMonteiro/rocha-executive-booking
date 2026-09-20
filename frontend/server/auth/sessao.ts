import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { config, producao } from "../config";

export const COOKIE_SESSAO = "admin_session";

export interface ClaimsSessao {
  sub: string;
  /** true quando o segundo fator (TOTP) foi validado nesta sessao. */
  mfa: boolean;
  /** Versao da sessao do admin: trocar senha/MFA invalida as sessoes antigas. */
  v: number;
  /** Inicio da sessao (epoch em segundos): base do teto absoluto de duracao. */
  ini: number;
}

export const agoraSegundos = () => Math.floor(Date.now() / 1000);

function segredo(): Uint8Array {
  if (!config.jwtSecret) throw new Error("JWT_SECRET nao configurado.");
  return new TextEncoder().encode(config.jwtSecret);
}

/**
 * O token vale so pelo tempo de INATIVIDADE (30 min). A cada requisicao do admin ele e
 * reemitido (sliding); `ini` guarda o inicio para impor o teto absoluto.
 */
export async function assinarSessao(adminId: number, mfa: boolean, versao: number, inicio = agoraSegundos()): Promise<string> {
  return new SignJWT({ mfa, v: versao, ini: inicio })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime(`${config.sessaoInatividadeMinutos}m`)
    .sign(segredo());
}

export async function lerSessao(token: string | undefined): Promise<ClaimsSessao | null> {
  if (!token || !config.jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    return payload.sub
      ? { sub: payload.sub, mfa: payload.mfa === true, v: Number(payload.v ?? 0), ini: Number(payload.ini ?? payload.iat ?? 0) }
      : null;
  } catch {
    return null;
  }
}

/** Opcoes do cookie: HttpOnly (inacessivel ao JS), SameSite=Strict e Secure em production. */
export function opcoesCookie(maxAgeSegundos = config.sessaoInatividadeMinutos * 60) {
  return {
    httpOnly: true,
    secure: producao(),
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSegundos,
  };
}
