import HomeConteudo from "./HomeConteudo";
import { carregarDadosPublicos } from "@/server/servicos/publico";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { destinos } = await carregarDadosPublicos();
  return <HomeConteudo destinos={destinos} />;
}
