import { NextResponse } from "next/server";
import { resumeFromToken } from "@/server/services/client-flow";

export async function GET(req: Request, ctx: RouteContext<"/continuar/[token]">) {
  const { token } = await ctx.params;
  const ok = await resumeFromToken(token);
  const res = NextResponse.redirect(new URL(ok ? "/viaje" : "/planificar", req.url), 303);
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
