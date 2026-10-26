import type { KnownConnection } from "../types";

const RENFE = { name: "Renfe", url: "https://www.renfe.com" };
const CP = { name: "Comboios de Portugal", url: "https://www.cp.pt" };
const SNCF = { name: "SNCF Connect", url: "https://www.sncf-connect.com" };
const EUROSTAR = { name: "Eurostar", url: "https://www.eurostar.com" };
const DB = { name: "Deutsche Bahn", url: "https://www.bahn.de" };
const OBB = { name: "ÖBB", url: "https://www.oebb.at" };
const CD = { name: "České dráhy", url: "https://www.cd.cz" };
const TRENITALIA = { name: "Trenitalia", url: "https://www.trenitalia.com" };
const ITALO = { name: "Italo", url: "https://www.italotreno.com" };
const NS = { name: "NS International", url: "https://www.nsinternational.com" };
const JR = { name: "JR Central (Tokaido Shinkansen)", url: "https://global.jr-central.co.jp" };
const MAV = { name: "MÁV", url: "https://www.mavcsoport.hu" };
const PKP = { name: "PKP Intercity", url: "https://www.intercity.pl" };

/**
 * Conexiones conocidas entre destinos de la biblioteca.
 * Las duraciones son ESTIMACIONES de referencia del trayecto más habitual.
 * Horarios, frecuencias y tarifas deben verificarse siempre con el operador.
 */
export const KNOWN_CONNECTIONS: KnownConnection[] = [
  { a: "madrid", b: "barcelona", mode: "train", hours: 2.75, operators: [RENFE] },
  { a: "madrid", b: "sevilla", mode: "train", hours: 2.75, operators: [RENFE] },
  { a: "madrid", b: "granada", mode: "train", hours: 3.5, operators: [RENFE] },
  { a: "sevilla", b: "granada", mode: "train", hours: 2.75, operators: [RENFE], note: "También hay buses frecuentes." },
  { a: "madrid", b: "lisboa", mode: "plane", hours: 1.25, operators: [], note: "Vuelo directo; la alternativa terrestre es larga." },
  { a: "lisboa", b: "porto", mode: "train", hours: 3, operators: [CP] },
  { a: "lisboa", b: "sevilla", mode: "bus", hours: 7, operators: [], note: "Bus directo o vuelo; verificar opciones vigentes." },
  { a: "barcelona", b: "paris", mode: "train", hours: 6.75, operators: [SNCF, RENFE], note: "Alta velocidad; un vuelo puede ahorrar tiempo." },
  { a: "paris", b: "londres", mode: "train", hours: 2.5, operators: [EUROSTAR] },
  { a: "paris", b: "amsterdam", mode: "train", hours: 3.5, operators: [EUROSTAR] },
  { a: "paris", b: "brujas", mode: "train", hours: 2.5, operators: [SNCF], note: "Generalmente con conexión en Bruselas." },
  { a: "londres", b: "brujas", mode: "train", hours: 3, operators: [EUROSTAR], note: "Vía Bruselas." },
  { a: "londres", b: "edimburgo", mode: "train", hours: 4.5, operators: [{ name: "LNER", url: "https://www.lner.co.uk" }] },
  { a: "brujas", b: "amsterdam", mode: "train", hours: 3.25, operators: [NS], note: "Conexión en Bruselas o Amberes." },
  { a: "amsterdam", b: "berlin", mode: "train", hours: 6.25, operators: [DB, NS] },
  { a: "paris", b: "munich", mode: "train", hours: 5.75, operators: [SNCF, DB] },
  { a: "berlin", b: "praga", mode: "train", hours: 4.5, operators: [DB, CD] },
  { a: "berlin", b: "munich", mode: "train", hours: 4.5, operators: [DB] },
  { a: "munich", b: "salzburgo", mode: "train", hours: 1.75, operators: [DB, OBB] },
  { a: "salzburgo", b: "viena", mode: "train", hours: 2.5, operators: [OBB] },
  { a: "munich", b: "viena", mode: "train", hours: 4, operators: [OBB, DB] },
  { a: "praga", b: "viena", mode: "train", hours: 4, operators: [CD, OBB] },
  { a: "viena", b: "budapest", mode: "train", hours: 2.75, operators: [OBB, MAV] },
  { a: "praga", b: "cracovia", mode: "train", hours: 7, operators: [CD, PKP], note: "También hay buses directos." },
  { a: "viena", b: "cracovia", mode: "train", hours: 7, operators: [OBB, PKP] },
  { a: "viena", b: "ljubljana", mode: "train", hours: 6, operators: [OBB] },
  { a: "salzburgo", b: "ljubljana", mode: "train", hours: 4.5, operators: [OBB] },
  { a: "ljubljana", b: "venecia", mode: "bus", hours: 3.5, operators: [], note: "Bus o traslado; conexión ferroviaria limitada." },
  { a: "munich", b: "venecia", mode: "train", hours: 7, operators: [OBB, TRENITALIA] },
  { a: "venecia", b: "florencia", mode: "train", hours: 2.25, operators: [TRENITALIA, ITALO] },
  { a: "florencia", b: "roma", mode: "train", hours: 1.5, operators: [TRENITALIA, ITALO] },
  { a: "roma", b: "amalfi", mode: "train", hours: 3.5, operators: [TRENITALIA, ITALO], note: "Tren a Nápoles/Salerno y luego ferry, bus o traslado a la costa." },
  { a: "venecia", b: "roma", mode: "train", hours: 3.75, operators: [TRENITALIA, ITALO] },
  { a: "atenas", b: "santorini", mode: "ferry", hours: 6, operators: [], note: "Ferry rápido o convencional desde El Pireo; también vuelos de ~45 min. Operación sujeta a temporada y clima." },
  { a: "tokio", b: "kioto", mode: "train", hours: 2.25, operators: [JR] },
  { a: "kioto", b: "osaka", mode: "train", hours: 0.5, operators: [{ name: "JR West", url: "https://www.westjr.co.jp" }] },
  { a: "tokio", b: "osaka", mode: "train", hours: 2.5, operators: [JR] },
  { a: "bangkok", b: "phuket", mode: "plane", hours: 1.5, operators: [] },
  { a: "orlando", b: "miami", mode: "car", hours: 3.75, operators: [{ name: "Brightline (tren)", url: "https://www.gobrightline.com" }], note: "Auto, tren o vuelo corto." },
  { a: "el-calafate", b: "ushuaia", mode: "plane", hours: 1.25, operators: [] },
  { a: "bariloche", b: "el-calafate", mode: "plane", hours: 1.75, operators: [] },
  { a: "cdmx", b: "riviera-maya", mode: "plane", hours: 2.25, operators: [] },
  { a: "cusco", b: "atacama", mode: "plane", hours: 5, operators: [], note: "Requiere conexiones; verificar rutas." },
  { a: "salta", b: "mendoza", mode: "plane", hours: 2, operators: [], note: "Frecuencias limitadas; verificar." },
  { a: "rio", b: "buzios", mode: "private_transfer", hours: 3, operators: [] },
];

export interface EntryLink {
  label: string;
  url: string;
}

const CANCILLERIA = { label: "Cancillería Argentina – información para viajar al exterior", url: "https://www.cancilleria.gob.ar" };
const SALUD = { label: "Ministerio de Salud – recomendaciones para viajeros", url: "https://www.argentina.gob.ar/salud" };
const SCHENGEN = { label: "Unión Europea – EES/ETIAS (sitio oficial)", url: "https://travel-europe.europa.eu" };

/** Fuentes oficiales para verificar requisitos de entrada. No contienen afirmaciones: son enlaces para consultar. */
export const ENTRY_LINKS: Record<string, EntryLink[]> = {
  ES: [SCHENGEN, CANCILLERIA, SALUD],
  PT: [SCHENGEN, CANCILLERIA, SALUD],
  FR: [SCHENGEN, CANCILLERIA, SALUD],
  NL: [SCHENGEN, CANCILLERIA, SALUD],
  BE: [SCHENGEN, CANCILLERIA, SALUD],
  DE: [SCHENGEN, CANCILLERIA, SALUD],
  CZ: [SCHENGEN, CANCILLERIA, SALUD],
  AT: [SCHENGEN, CANCILLERIA, SALUD],
  HU: [SCHENGEN, CANCILLERIA, SALUD],
  PL: [SCHENGEN, CANCILLERIA, SALUD],
  SI: [SCHENGEN, CANCILLERIA, SALUD],
  IT: [SCHENGEN, CANCILLERIA, SALUD],
  GR: [SCHENGEN, CANCILLERIA, SALUD],
  HR: [SCHENGEN, CANCILLERIA, SALUD],
  GB: [{ label: "Gobierno del Reino Unido – visas y autorizaciones (ETA)", url: "https://www.gov.uk/check-uk-visa" }, CANCILLERIA],
  US: [{ label: "Departamento de Estado de EE. UU. – viajes", url: "https://travel.state.gov" }, CANCILLERIA],
  DO: [{ label: "República Dominicana – e-Ticket migratorio", url: "https://eticket.migracion.gob.do" }, CANCILLERIA, SALUD],
  MX: [{ label: "Secretaría de Relaciones Exteriores de México", url: "https://www.gob.mx/sre" }, CANCILLERIA],
  AW: [{ label: "Aruba – ED Card (tarjeta de embarque/desembarque)", url: "https://www.edcardaruba.aw" }, CANCILLERIA],
  CW: [{ label: "Curazao – Digital Immigration Card", url: "https://dicardcuracao.com" }, CANCILLERIA],
  CO: [{ label: "Migración Colombia", url: "https://www.migracioncolombia.gov.co" }, CANCILLERIA, SALUD],
  BR: [{ label: "Gobierno de Brasil – Itamaraty", url: "https://www.gov.br/mre" }, CANCILLERIA, SALUD],
  PE: [{ label: "Migraciones Perú", url: "https://www.migraciones.gob.pe" }, CANCILLERIA, SALUD],
  CL: [CANCILLERIA],
  CR: [{ label: "Dirección General de Migración de Costa Rica", url: "https://www.migracion.go.cr" }, CANCILLERIA, SALUD],
  JP: [{ label: "Ministerio de Relaciones Exteriores de Japón – visas", url: "https://www.mofa.go.jp/j_info/visit/visa/" }, CANCILLERIA],
  TH: [{ label: "Ministerio de Relaciones Exteriores de Tailandia", url: "https://www.mfa.go.th" }, CANCILLERIA, SALUD],
  ID: [{ label: "Inmigración de Indonesia – e-Visa", url: "https://evisa.imigrasi.go.id" }, CANCILLERIA, SALUD],
  MV: [{ label: "Inmigración de Maldivas", url: "https://immigration.gov.mv" }, CANCILLERIA],
  AE: [{ label: "Portal oficial de los Emiratos Árabes Unidos", url: "https://u.ae" }, CANCILLERIA],
  AR: [],
};
