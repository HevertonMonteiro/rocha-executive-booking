import "server-only";

/**
 * Preco efetivo de uma rota (numeric exato calculado no Postgres):
 *   modo "fixo": rota.preco_fixo
 *   modo "km"  : veiculo.preco_base (valor fixo) + rota.distancia_km * veiculo.preco_por_km
 * Requer os aliases `r` (rotas) e `v` (veiculos) na consulta.
 */
export const SQL_PRECO_ROTA = `(case when r.modo_preco = 'km' and r.distancia_km is not null
  then round(v.preco_base + r.distancia_km * v.preco_por_km, 2) else r.preco_fixo end)`;
