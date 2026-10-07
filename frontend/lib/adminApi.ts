import axios from "axios";

// Mesma origem do site; a sessao vai em cookie HttpOnly (o JavaScript nunca ve o token).
export const adminApi = axios.create({ baseURL: "/api/admin", timeout: 30000, withCredentials: true });

adminApi.interceptors.response.use(
  (r) => r,
  (erro) => {
    const status = erro?.response?.status;
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login") && status === 401) {
      window.location.href = "/admin/login?motivo=expirada";
    }
    return Promise.reject(erro);
  }
);

export function mensagemErro(e: unknown, padrao = "Nao foi possivel concluir a operacao."): string {
  const detalhe = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detalhe === "string" ? detalhe : padrao;
}

export function codigoErro(e: unknown): string | undefined {
  return (e as { response?: { data?: { codigo?: string } } })?.response?.data?.codigo;
}
