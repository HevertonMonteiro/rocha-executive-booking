/** Dinheiro sempre em centavos inteiros: nada de ponto flutuante em calculos financeiros. */

export function paraCentavos(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  return Math.round(Number(valor) * 100);
}

/** 6500 -> "65.00" (formato aceito pelo numeric do Postgres e pela SumUp). */
export function deCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** Percentual arredondado para CIMA: o sinal nunca fica abaixo do minimo exigido. */
export function percentualDe(centavos: number, percentual: number): number {
  return Math.floor((centavos * percentual + 99) / 100);
}
