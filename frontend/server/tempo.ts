/**
 * Datas de viagem sao "relogio de parede" (timestamp sem fuso, horario local da
 * Franca). Para fazer contas usamos o instante como se fosse UTC, o que e
 * consistente entre todas as reservas e nao sofre com mudanca de horario de verao.
 */

export function paraMs(dataLocal: string): number {
  const iso = dataLocal.replace(" ", "T");
  return Date.parse(/[zZ]|[+-]\d\d(:?\d\d)?$/.test(iso) ? iso : iso + "Z");
}

export function deMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19); // 2026-10-01T10:00:00
}

/** Normaliza o texto de timestamp/timestamptz do Postgres para ISO 8601 valido. */
export function paraIso(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let v = valor.replace(" ", "T");
  if (/[+-]\d\d$/.test(v)) v += ":00";
  return v;
}
