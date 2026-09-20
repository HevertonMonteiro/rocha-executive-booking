import { NextResponse } from "next/server";
import { consulta } from "@/server/db/client";
import { ErroHttp, lerCorpo, publica } from "@/server/http";
import { schemaNovoParceiro } from "@/server/schemas";

export const dynamic = "force-dynamic";

export const POST = publica(
  async ({ req }) => {
    const d = await lerCorpo(req, schemaNovoParceiro);
    // Robo preencheu o campo isca: finge sucesso sem gravar nada.
    if (d.contato_extra) return NextResponse.json({ parceiro_id: 0 }, { status: 201 });

    const existe = await consulta("select 1 from parceiros where email = $1", [d.email]);
    if (existe.length) throw new ErroHttp(409, "Ja existe um cadastro com este e-mail.", "PARCEIRO_DUPLICADO");

    const [p] = await consulta<{ id: number }>(
      `insert into parceiros (nome, email, telefone, empresa, cidade, endereco, site)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [d.nome, d.email, d.telefone, d.empresa, d.cidade, d.endereco, d.site]
    );
    return NextResponse.json({ parceiro_id: p.id }, { status: 201 });
  },
  { limite: { nome: "parceiro", max: 5, janelaSeg: 3600 } }
);
