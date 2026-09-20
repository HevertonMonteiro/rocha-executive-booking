import { publica } from "@/server/http";
import { listarVeiculosAtivos } from "@/server/servicos/publico";

export const dynamic = "force-dynamic";

export const GET = publica(() => listarVeiculosAtivos());
