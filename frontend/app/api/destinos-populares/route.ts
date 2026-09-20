import { publica } from "@/server/http";
import { listarDestinosPopulares } from "@/server/servicos/publico";

export const dynamic = "force-dynamic";

export const GET = publica(() => listarDestinosPopulares());
