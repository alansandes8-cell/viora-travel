import { NextResponse } from "next/server";
import { currentStaff } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { addFile, tripBundle } from "@/server/services/my-trip";
import { agency } from "@/server/settings";

/** Subida de vouchers (PDF o imagen) para un viaje vendido. Solo el equipo. */
export async function POST(req: Request, ctx: RouteContext<"/admin/viajes-archivos/[id]">) {
  const staff = await currentStaff();
  if (!staff || staff.role === "viewer") return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host && new URL(origin).host !== new URL(agency.appUrl()).host) return NextResponse.json({ error: "Origen inválido." }, { status: 403 });
  const { id } = await ctx.params;
  const b = await tripBundle(id, null);
  if (!b) return NextResponse.json({ error: "Viaje inexistente." }, { status: 404 });
  const fd = await req.formData();
  const itemId = String(fd.get("itemId") ?? "") || null;
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  if (!files.length) return NextResponse.json({ error: "Elegí un archivo." }, { status: 400 });
  for (const f of files) {
    const r = await addFile(id, itemId, f.name, Buffer.from(await f.arrayBuffer()));
    if (!r.ok) return NextResponse.json({ error: `${f.name}: ${r.error}` }, { status: 400 });
  }
  await logActivity("trip.files", { actorKind: "staff", actorId: staff.id, details: { id, count: files.length } });
  return NextResponse.json({ ok: true });
}
