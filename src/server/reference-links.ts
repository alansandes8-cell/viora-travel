import "server-only";

/**
 * Enlaces opcionales a plataformas de referencia (Booking, Civitatis…). Solo aparecen si la
 * agencia configura su enlace de afiliado como plantilla, por ejemplo:
 *   BOOKING_URL_TEMPLATE=https://www.booking.com/searchresults.es.html?ss={q}&checkin={checkin}&checkout={checkout}&group_adults={adults}&aid=TU_ID
 *   CIVITATIS_URL_TEMPLATE=https://www.civitatis.com/es/buscar/?q={q}&aid=TU_ID
 * Sin plantilla no se muestra nada (así la persona pide la cotización a VIORA).
 */
const ENV = { booking: "BOOKING_URL_TEMPLATE", civitatis: "CIVITATIS_URL_TEMPLATE" } as const;

export function referenceLink(kind: keyof typeof ENV, values: Record<string, string | number>): string | null {
  const tpl = process.env[ENV[kind]];
  if (!tpl || !/^https:\/\//.test(tpl)) return null;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(String(values[k] ?? "")));
}
