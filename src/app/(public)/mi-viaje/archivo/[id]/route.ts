import { currentClientAccount } from "@/server/auth/client-session";
import { currentStaff } from "@/server/auth/session";
import { tripFileFor } from "@/server/services/my-trip";

/** Voucher: solo para el dueño del viaje (publicado) o para el equipo. Nunca se cachea en proxies. */
export async function GET(_req: Request, ctx: RouteContext<"/mi-viaje/archivo/[id]">) {
  const { id } = await ctx.params;
  const staff = await currentStaff();
  const acc = staff ? null : await currentClientAccount();
  if (!staff && !acc) return new Response("Iniciá sesión para ver este archivo.", { status: 401 });
  const f = await tripFileFor(id, staff ? null : acc!.clientId);
  if (!f) return new Response("No encontrado.", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Length": String(f.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Robots-Tag": "noindex",
    },
  });
}
