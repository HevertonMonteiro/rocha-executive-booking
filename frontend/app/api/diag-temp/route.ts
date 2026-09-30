import { NextRequest, NextResponse } from "next/server";

// Rota de diagnostico TEMPORARIA: nunca devolve valores reais de segredo, so
// booleanos/tamanhos, para confirmar quais variaveis de ambiente estao
// presentes em producao. Remover apos o uso.
const TOKEN = "b3e4dbd54b6b2c1b7af58097f60832292db2310647afcbf1";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("chave") !== TOKEN) {
    return NextResponse.json({ erro: "nao autorizado" }, { status: 404 });
  }

  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecretLen: (process.env.JWT_SECRET || "").length,
    appEncryptionKeySet: !!process.env.APP_ENCRYPTION_KEY,
    appEncryptionKeyLen: (process.env.APP_ENCRYPTION_KEY || "").length,
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseUrlHost: (() => {
      try {
        return new URL(process.env.DATABASE_URL || "").host;
      } catch {
        return null;
      }
    })(),
    siteUrl: process.env.SITE_URL,
    storageDriver: process.env.STORAGE_DRIVER,
    supabaseUrlSet: !!process.env.SUPABASE_URL,
    supabaseServiceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseServiceRoleKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length,
  };

  try {
    const postgres = (await import("postgres")).default;
    const url = process.env.DATABASE_URL || "";
    const sql = postgres(url, {
      prepare: false,
      connect_timeout: 8,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
    try {
      const r = await sql`select 1 as ok`;
      info.dbConnect = "ok";
      info.dbResult = r[0];
    } catch (e) {
      info.dbConnect = "falhou";
      info.dbErrorCode = (e as { code?: string })?.code ?? null;
      info.dbErrorMessage = e instanceof Error ? e.message : String(e);
    } finally {
      await sql.end({ timeout: 3 });
    }
  } catch (e) {
    info.dbConnect = "excecao_ao_importar";
    info.dbErrorMessage = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(info);
}
