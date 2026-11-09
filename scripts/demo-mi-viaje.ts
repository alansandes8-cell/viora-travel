/**
 * Crea un viaje de EJEMPLO en «Mi viaje» para ver cómo queda y mostrarlo (se puede usar en el servidor).
 * Cliente «DEMO · Cliente de prueba», viaje publicado a Europa con vuelos, hoteles, trenes, actividades,
 * asistencia y plan día por día. Si ya existe, lo vuelve a crear desde cero.
 *
 * Uso:  pnpm demo:mi-viaje --email tu-email@ejemplo.com [--sitio https://viora-travel.com]
 * Al final muestra el enlace para elegir la contraseña y entrar como el cliente.
 */
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";
import { buildPlan } from "../src/core/my-trip";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const DEMO_NAME = "DEMO · Cliente de prueba";

type Item = {
  key: string;
  kind: string;
  title: string;
  provider?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  place?: string;
  address?: string;
  confirmation?: string;
  details?: string;
  breakfast?: boolean;
  rating?: string;
  price?: number;
  currency?: string;
};

const ITEMS: Item[] = [
  { key: "ida", kind: "flight", title: "Buenos Aires (EZE) → Roma (FCO)", provider: "Aerolínea de ejemplo", startDate: "2027-05-14", startTime: "22:35", endDate: "2027-05-15", endTime: "17:00", confirmation: "DEMO12", details: "Equipaje: 1 valija de 23 kg + equipaje de mano. Presentarse 3 horas antes en Ezeiza." },
  { key: "roma", kind: "hotel", title: "Hotel de ejemplo en Roma", startDate: "2027-05-15", startTime: "13:00", endDate: "2027-05-17", endTime: "11:00", place: "Roma", address: "Via Marsala, Roma (cerca de Roma Termini)", breakfast: false, rating: "4,9", price: 266, confirmation: "RM-0001" },
  { key: "tour", kind: "activity", title: "Free tour por Roma", provider: "Civitatis", startDate: "2027-05-16", startTime: "10:00", place: "Roma", address: "Piazza Venezia, Roma", details: "Punto de encuentro: frente al Altare della Patria. Duración: 2 h 30." },
  { key: "tren1", kind: "train", title: "Tren Roma → Florencia", provider: "Trenitalia", startDate: "2027-05-17", startTime: "09:00", endTime: "10:35", confirmation: "TR-ABC1", details: "Sale de Roma Termini. Validá el billete antes de subir." },
  { key: "flo", kind: "hotel", title: "Hotel de ejemplo en Florencia", startDate: "2027-05-17", startTime: "14:00", endDate: "2027-05-20", endTime: "10:00", place: "Florencia", address: "Centro histórico, Florencia", breakfast: true, rating: "4,7", price: 390 },
  { key: "tren2", kind: "train", title: "Tren Florencia → Venecia", provider: "Trenitalia", startDate: "2027-05-20", startTime: "10:20", endTime: "12:30" },
  { key: "ven", kind: "hotel", title: "Hotel de ejemplo en Venecia", startDate: "2027-05-20", startTime: "15:00", endDate: "2027-05-22", endTime: "11:00", place: "Venecia", address: "Cannaregio, Venecia", breakfast: true, rating: "4,8", price: 310 },
  { key: "vuelo2", kind: "flight", title: "Venecia (VCE) → París (CDG)", startDate: "2027-05-22", startTime: "12:45", endTime: "14:40" },
  { key: "par", kind: "hotel", title: "Hotel de ejemplo en París", startDate: "2027-05-22", startTime: "15:00", endDate: "2027-05-25", endTime: "11:00", place: "París", address: "Le Marais, París", breakfast: false, rating: "4,6", price: 480 },
  { key: "disney", kind: "activity", title: "Disneyland París (entrada 1 día)", startDate: "2027-05-24", startTime: "09:00", place: "París" },
  { key: "vuelta", kind: "flight", title: "París (CDG) → Buenos Aires (EZE)", startDate: "2027-05-25", startTime: "20:05", endDate: "2027-05-26", endTime: "04:10" },
  { key: "asis", kind: "insurance", title: "Asistencia al viajero (ejemplo)", startDate: "2027-05-14", endDate: "2027-05-26", details: "Cobertura médica en Europa. Ante cualquier emergencia, llamar primero a la central de asistencia." },
];

const COUNTRY: Record<string, string> = { Roma: "IT", Florencia: "IT", Venecia: "IT", París: "FR" };

/** Horarios del día como en el PDF de la agencia. */
const EXTRA: Record<string, { time: string; title: string; text?: string; photo?: string; summary?: string }[]> = {
  "2027-05-16": [
    { time: "13:00", title: "Almorzar comida italiana en el centro de Roma", text: "Y comer un heladito 🍨 (buscar lugar para almorzar)" },
    { time: "16:00", title: "Pasear por la Fontana di Trevi y el barrio Trastévere", text: "No olvidarse del helado 🍦", photo: "Trevi Fountain" },
    { time: "20:00", title: "Cenar por el centro y volver a comer helado", text: "(buscar lugar para comer y heladería)" },
  ],
  "2027-05-18": [
    { time: "10:00", title: "Duomo de Florencia y Piazza della Signoria", photo: "Florence Cathedral" },
    { time: "18:30", title: "Atardecer en Piazzale Michelangelo", photo: "Piazzale Michelangelo" },
  ],
  "2027-05-21": [
    { time: "10:00", title: "Plaza San Marcos y Palacio Ducal", photo: "St Mark's Square" },
    { time: "16:00", title: "Paseo en góndola", text: "Conviene acordar el precio antes de subir." },
  ],
  "2027-05-23": [
    { time: "10:00", title: "Torre Eiffel y Trocadero", photo: "Eiffel Tower" },
    { time: "15:00", title: "Museo del Louvre", photo: "Louvre" },
  ],
};
const SUMMARY: Record<string, string> = {
  "2027-05-14": "22:35 · Salida de Buenos Aires a Roma",
  "2027-05-15": "17:00 · Llegada a Roma",
  "2027-05-16": "Día completo en Roma",
  "2027-05-17": "Tren a Florencia",
  "2027-05-18": "Día completo en Florencia",
  "2027-05-19": "Excursión a Pisa",
  "2027-05-20": "Tren a Venecia",
  "2027-05-21": "Día completo en Venecia",
  "2027-05-22": "Vuelo a París",
  "2027-05-23": "Día completo en París",
  "2027-05-24": "Disneyland",
  "2027-05-25": "Último día en París · 20:05 vuelo a Bs As",
  "2027-05-26": "04:10 · Llegada a Buenos Aires",
};

async function main() {
  const email = arg("email")?.toLowerCase().trim();
  if (!email || !email.includes("@")) throw new Error("Indicá --email (será el usuario del cliente de prueba; usá uno tuyo).");
  const site = (arg("sitio") ?? process.env.APP_URL ?? "https://viora-travel.com").replace(/\/$/, "");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => pool.query(sql, params).then((r) => r.rows as T[]);

  // Si el email ya tiene acceso con otro cliente real, no se toca.
  const [taken] = await q<{ client_id: string; name: string }>(`SELECT a.client_id, c.name FROM internal.client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.email = $1`, [email]);
  if (taken && taken.name !== DEMO_NAME) throw new Error("Ese email ya tiene acceso como cliente real. Usá otro para la prueba.");

  // Cliente de prueba (se recrea).
  await q(`DELETE FROM clients WHERE name = $1 AND source = 'demo'`, [DEMO_NAME]);
  const [client] = await q<{ id: string }>(`INSERT INTO clients (name, email, consent_contact, consent_at, source) VALUES ($1, $2, true, now(), 'demo') RETURNING id`, [DEMO_NAME, email]);
  const [trip] = await q<{ id: string }>(
    `INSERT INTO internal.booked_trips (client_id, title, subtitle, start_date, end_date, travelers, cover_place, europa_go, assistance, notes, status)
     VALUES ($1, 'Plan de viaje', 'Europa 2027', '2027-05-14', '2027-05-26', 'Viaje de ejemplo para 2 personas', 'Lago di Braies', true, $2, $3, 'published') RETURNING id`,
    [
      client.id,
      "Asistencia de ejemplo · Póliza 000-000 · Central 24 h: +00 0000 0000 (reemplazar por los datos reales de cada cliente)",
      "Este es un viaje de EJEMPLO para mostrar cómo se ve «Mi viaje». Los hoteles, horarios y códigos no son reales.",
    ],
  );
  const ids: Record<string, string> = {};
  for (const [i, it] of ITEMS.entries()) {
    const [row] = await q<{ id: string }>(
      `INSERT INTO internal.trip_items (trip_id, kind, title, provider, start_date, start_time, end_date, end_time, place, address, confirmation, details, breakfast, rating, price, currency, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [trip.id, it.kind, it.title, it.provider ?? "", it.startDate, it.startTime ?? "", it.endDate ?? null, it.endTime ?? "", it.place ?? "", it.address ?? "", it.confirmation ?? "", it.details ?? "", it.breakfast ?? null, it.rating ?? "", it.price ?? null, it.currency ?? "USD", i],
    );
    ids[it.key] = row.id;
  }

  // Plan: automático (ciudades por hotel, vuelos/trenes/actividades) + horarios de ejemplo.
  const items = ITEMS.map((it) => ({ id: ids[it.key], kind: it.kind, title: it.title, place: it.place ?? "", startDate: it.startDate, startTime: it.startTime ?? "", endDate: it.endDate ?? null, endTime: it.endTime ?? "" }));
  const plan = buildPlan("2027-05-14", "2027-05-26", [], items, (p) => COUNTRY[p] ?? "").map((d) => {
    const city = d.city || (d.date === "2027-05-25" ? "París" : d.date === "2027-05-15" ? "Roma" : d.date <= "2027-05-14" || d.date >= "2027-05-26" ? "Buenos Aires" : d.city);
    const entries = [...d.entries, ...(EXTRA[d.date] ?? []).map((e) => ({ time: e.time, title: e.title, text: e.text ?? "", link: "", photo: e.photo ?? "", itemId: "" }))].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    for (const e of entries) if (e.title === "Free tour por Roma") e.photo = "Roman Forum";
    return { ...d, city, countryCode: COUNTRY[city] ?? (city === "Buenos Aires" ? "AR" : d.countryCode), summary: SUMMARY[d.date] ?? d.summary, entries };
  });
  await q(`UPDATE internal.booked_trips SET plan = $1::jsonb WHERE id = $2`, [JSON.stringify(plan), trip.id]);

  // Acceso: enlace para elegir la contraseña (14 días, un solo uso).
  const [acc] = await q<{ id: string }>(`INSERT INTO internal.client_accounts (client_id, email) VALUES ($1, $2) RETURNING id`, [client.id, email]);
  const token = randomBytes(32).toString("base64url");
  await q(`INSERT INTO internal.client_account_tokens (account_id, token_hash, purpose, expires_at) VALUES ($1, $2, 'activate', now() + interval '14 days')`, [acc.id, createHash("sha256").update(token).digest("hex")]);
  await pool.end();

  console.log("✓ Viaje de ejemplo creado: «Plan de viaje · Europa 2027» (Roma, Florencia, Venecia y París).");
  console.log(`  Cliente: ${DEMO_NAME} — usuario: ${email}`);
  console.log(`  1) Elegí la contraseña acá: ${site}/acceder/clave/${token}`);
  console.log(`  2) Después entrás siempre desde ${site}/acceder`);
  console.log("  En el panel lo ves en «Viajes vendidos» para editarlo o subir un voucher de prueba.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
