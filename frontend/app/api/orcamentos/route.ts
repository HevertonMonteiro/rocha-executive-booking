import { NextResponse } from "next/server";
import { lerCorpo, publica } from "@/server/http";
import { schemaSolicitacaoOrcamento } from "@/server/schemas";
import { notificarNovoOrcamento } from "@/server/servicos/notificacoes";
import { criarSolicitacaoOrcamento } from "@/server/servicos/orcamentos";

export const dynamic = "force-dynamic";

export const POST = publica(
  async ({ req }) => {
    const d = await lerCorpo(req, schemaSolicitacaoOrcamento);
    // Robo preencheu o campo isca: finge sucesso sem gravar nada.
    if (d.contato_extra) return NextResponse.json({ ok: true }, { status: 201 });

    const { id } = await criarSolicitacaoOrcamento(d);
    await notificarNovoOrcamento(d);
    return NextResponse.json({ ok: true, id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  },
  { limite: { nome: "orcamento", max: 10, janelaSeg: 600 } }
);
