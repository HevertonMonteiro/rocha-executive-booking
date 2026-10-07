import { comAdmin } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = comAdmin(({ admin }) => ({ id: admin.id, email: admin.email, nome: admin.nome }));
