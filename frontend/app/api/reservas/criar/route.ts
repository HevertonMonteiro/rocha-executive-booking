import { NextResponse } from "next/server";
import { lerCorpo, publica } from "@/server/http";
import { schemaNovaReserva } from "@/server/schemas";
import { criarReserva } from "@/server/servicos/reservas";
import { deCentavos } from "@/server/dinheiro";

export const dynamic = "force-dynamic";

export const POST = publica(
  async ({ req }) => {
    const dados = await lerCorpo(req, schemaNovaReserva);
    const reserva = await criarReserva(dados);
    return NextResponse.json(
      {
        reserva_id: reserva.id,
        codigo: reserva.codigo,
        checkout_reference: `ROCHA-${reserva.codigo}`,
        preco_total: deCentavos(reserva.precoTotalCentavos),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  },
  { limite: { nome: "reserva", max: 10, janelaSeg: 600 } }
);
