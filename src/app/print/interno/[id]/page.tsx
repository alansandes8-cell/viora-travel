import { notFound } from "next/navigation";
import { InternalReport } from "@/components/admin/internal-report";
import { verifySignature } from "@/server/security";
import { projectBundle } from "@/server/services/admin";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Versión imprimible del informe interno: solo accesible con firma temporal emitida desde el panel. */
export default async function PrintInternal({ params, searchParams }: PageProps<"/print/interno/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id) || !verifySignature(`internal:${id}`, Number(sp.exp), String(sp.sig ?? ""))) notFound();
  const b = await projectBundle(id);
  if (!b?.current) notFound();
  return <InternalReport b={b} />;
}
