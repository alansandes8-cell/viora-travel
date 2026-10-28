import { NextResponse } from "next/server";
import { relativeRedirect, renderPdf, signedPrintUrl } from "@/server/pdf";
import { resolveShareLink } from "@/server/services/projects";

export async function GET(_req: Request, ctx: RouteContext<"/p/[token]/pdf">) {
  const { token } = await ctx.params;
  const link = await resolveShareLink(token);
  if (!link || link.kind !== "client_proposal") return new NextResponse("Enlace inválido o vencido.", { status: 404 });
  const url = signedPrintUrl(`/print/cliente/${link.snapshotId}`, `client:${link.snapshotId}`);
  try {
    const pdf = await renderPdf(url);
    if (pdf) return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="propuesta-viora-travel.pdf"', "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("[viora] PDF falló", (e as Error).message);
  }
  // Alternativa funcional: versión imprimible para "Guardar como PDF" desde el navegador.
  const local = new URL(url);
  return relativeRedirect(`${local.pathname}${local.search}&autoprint=1`);
}
