import "server-only";
import { sql } from "drizzle-orm";
import { ENTRY_LINKS, KNOWN_CONNECTIONS } from "@/core/library";
import type { Destination } from "@/core/types";
import { db, schema } from "./db";

export function libraryUrls(library: Destination[]): string[] {
  const urls = new Set<string>();
  library.forEach((d) => {
    if (d.tourismUrl) urls.add(d.tourismUrl);
    d.highlights.forEach((h) => h.url && urls.add(h.url));
  });
  KNOWN_CONNECTIONS.forEach((c) => c.operators.forEach((o) => urls.add(o.url)));
  Object.values(ENTRY_LINKS).flat().forEach((l) => urls.add(l.url));
  return [...urls];
}

/** Verifica enlaces (HEAD y, si falla, GET). Guarda resultado y fecha: un enlace se considera verificado solo tras esta comprobación. */
export async function checkLinks(urls: string[]): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  const queue = urls.slice(0, 120);
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!;
      let status: number | null = null;
      try {
        let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "VioraTravel-LinkCheck/1.0" } });
        if (res.status >= 400) res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "VioraTravel-LinkCheck/1.0" } });
        status = res.status;
      } catch {
        status = null;
      }
      const good = status !== null && status < 400;
      if (good) ok++;
      else failed++;
      await db()
        .insert(schema.linkChecks)
        .values({ url, ok: good, statusCode: status })
        .onConflictDoUpdate({ target: schema.linkChecks.url, set: { ok: good, statusCode: status, checkedAt: sql`now()` } });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { ok, failed };
}
