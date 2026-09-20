// frontend/lib/api.ts
import axios from "axios";

// A API roda no proprio Next.js (mesma origem): sem CORS e com o cookie de
// sessao do admin protegido (HttpOnly, SameSite=Strict).
export const api = axios.create({
  baseURL: "",
  timeout: 20000,
  withCredentials: true,
});
