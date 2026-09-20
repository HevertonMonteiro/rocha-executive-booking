import { publica } from "@/server/http";
import { lerConfiguracoes } from "@/server/servicos/configuracoes";

export const dynamic = "force-dynamic";

export const GET = publica(async () => lerConfiguracoes(true));
