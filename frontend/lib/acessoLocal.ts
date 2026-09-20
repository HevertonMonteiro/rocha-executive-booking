// Sem dependencias de Node: usado tanto no servidor quanto no middleware (edge).

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const IPS_LOCAIS = new Set(["::1", "127.0.0.1", "::ffff:127.0.0.1"]);

const semPorta = (host: string) => host.trim().toLowerCase().replace(/:\d+$/, "");

/**
 * true somente quando a requisicao veio DIRETO do proprio computador.
 *
 * Um link publico (tunel Cloudflare/ngrok, dominio) sempre chega com o `Host` do tunel e
 * com o IP real do visitante em X-Forwarded-For: nesses casos devolve false. O Next em
 * desenvolvimento acrescenta sozinho X-Forwarded-For "::1" e X-Forwarded-Host "localhost":
 * esses valores de loopback sao aceitos.
 */
export function requisicaoLocal(headers: Headers): boolean {
  if (!HOSTS_LOCAIS.has(semPorta(headers.get("host") ?? ""))) return false;

  const hostEncaminhado = headers.get("x-forwarded-host");
  if (hostEncaminhado && !HOSTS_LOCAIS.has(semPorta(hostEncaminhado.split(",")[0]))) return false;

  for (const nome of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]) {
    const valor = headers.get(nome);
    if (valor && !valor.split(",").every((ip) => IPS_LOCAIS.has(ip.trim().toLowerCase()))) return false;
  }
  return !headers.get("forwarded");
}
