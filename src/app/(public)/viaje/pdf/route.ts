import { NextResponse } from "next/server";
import { renderPdf, signedPrintUrl } from "@/server/pdf";
import { currentProposal } from "@/server/services/client-flow";

export async function GET(req: Request) {
  const data = await currentProposal();
  if (!data) return new NextResponse("No encontramos tu propuesta.", { status: 404 });
  const url = signedPrintUrl(`/print/cliente/${data.snapshotId}`, `client:${data.snapshotId}`);
  try {
    const pdf = await renderPdf(url);
    if (pdf) return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="mi-viaje-viora-travel.pdf"', "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("[viora] PDF falló", (e as Error).message);
  }
  const local = new URL(url);
  return NextResponse.redirect(new URL(`${local.pathname}${local.search}&autoprint=1`, req.url), 303);
}
