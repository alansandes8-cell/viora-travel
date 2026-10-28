import { NextResponse } from "next/server";
import { requireStaff } from "@/server/auth/session";
import { componentsCsv, projectXlsx } from "@/server/exports";
import { relativeRedirect, renderPdf, signedPrintUrl } from "@/server/pdf";
import { projectBundle } from "@/server/services/admin";

export async function GET(req: Request, ctx: RouteContext<"/admin/proyectos/[id]/export/[format]">) {
  await requireStaff();
  const { id, format } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const b = await projectBundle(id);
  if (!b?.current) return new NextResponse("No encontrado", { status: 404 });
  const base = `${b.project.code}-v${b.current.number}`;
  const headers = (type: string, name: string) => ({ "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" });
  switch (format) {
    case "json":
      return new NextResponse(JSON.stringify({ project: b.project, version: b.current.number, document: b.current.document, components: b.components, tasks: b.tasks }, null, 2), { headers: headers("application/json", `${base}.json`) });
    case "csv":
      return new NextResponse(componentsCsv(b), { headers: headers("text/csv; charset=utf-8", `${base}-servicios.csv`) });
    case "xlsx":
      return new NextResponse(new Uint8Array(await projectXlsx(b)), { headers: headers("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${base}.xlsx`) });
    case "pdf": {
      const url = signedPrintUrl(`/print/interno/${id}`, `internal:${id}`);
      try {
        const pdf = await renderPdf(url);
        if (pdf) return new NextResponse(new Uint8Array(pdf), { headers: headers("application/pdf", `${base}-interno.pdf`) });
      } catch (e) {
        console.error("[viora] PDF interno falló", (e as Error).message);
      }
      return relativeRedirect(`/admin/proyectos/${id}/informe`);
    }
    default:
      return new NextResponse("Formato no soportado", { status: 400 });
  }
}
