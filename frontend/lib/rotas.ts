function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Formato do <input type="datetime-local">, no horário local do usuário.
function amanhaAs10(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export function linkRotaRapida(origemId: number, destinoId: number): string {
  const params = new URLSearchParams({
    origem_id: String(origemId),
    destino_id: String(destinoId),
    data_ida: amanhaAs10(),
    tipo_trajeto: "one_way",
    passageiros: "1",
  });
  return `/selecao?${params.toString()}`;
}
