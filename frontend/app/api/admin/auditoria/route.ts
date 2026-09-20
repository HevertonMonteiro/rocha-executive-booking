import { consulta } from "@/server/db/client";
import { comAdmin } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = comAdmin(() =>
  consulta(
    `select a.id, a.acao, a.status_http, a.ip, a.criado_em::text as criado_em, ad.email as admin_email
       from auditoria_admin a left join admins ad on ad.id = a.admin_id
      order by a.id desc limit 200`
  )
);
