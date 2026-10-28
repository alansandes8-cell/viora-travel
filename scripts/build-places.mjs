// Genera src/data/places.json (aeropuertos con vuelos regulares, ciudades y países) a partir
// del paquete público «airports-json» (datos de OurAirports, dominio público).
// Uso: node scripts/build-places.mjs <carpeta del paquete descomprimido>
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Indicá la carpeta del paquete airports-json");
const airports = JSON.parse(readFileSync(path.join(dir, "data", "airports.json"), "utf8"));
const countries = JSON.parse(readFileSync(path.join(dir, "data", "countries.json"), "utf8"));
const es = new Intl.DisplayNames(["es"], { type: "region" });
const countryName = (cc) => {
  try {
    return es.of(cc) ?? countries.find((c) => c.code === cc)?.name ?? cc;
  } catch {
    return countries.find((c) => c.code === cc)?.name ?? cc;
  }
};

// Nombres en español de ciudades frecuentes (el dataset está en inglés).
const ES_CITY = {
  London: "Londres", "New York": "Nueva York", Rome: "Roma", Munich: "Múnich", Vienna: "Viena", Prague: "Praga", Florence: "Florencia",
  Venice: "Venecia", Milan: "Milán", Naples: "Nápoles", Turin: "Turín", Athens: "Atenas", Lisbon: "Lisboa", Seville: "Sevilla", Brussels: "Bruselas",
  Geneva: "Ginebra", Zurich: "Zúrich", Copenhagen: "Copenhague", Stockholm: "Estocolmo", Moscow: "Moscú", "Saint Petersburg": "San Petersburgo",
  Warsaw: "Varsovia", Krakow: "Cracovia", Kraków: "Cracovia", Tokyo: "Tokio", Kyoto: "Kioto", Beijing: "Pekín", Cairo: "El Cairo", Istanbul: "Estambul",
  Edinburgh: "Edimburgo", Dublin: "Dublín", Berlin: "Berlín", Hamburg: "Hamburgo", Cologne: "Colonia", Frankfurt: "Fráncfort",
  "Frankfurt am Main": "Fráncfort", Marseille: "Marsella", Nice: "Niza", Bordeaux: "Burdeos", "Mexico City": "Ciudad de México", Havana: "La Habana",
  "Sao Paulo": "San Pablo", "São Paulo": "San Pablo", "Cape Town": "Ciudad del Cabo", Dubai: "Dubái", Singapore: "Singapur", Seoul: "Seúl",
  Philadelphia: "Filadelfia", Amsterdam: "Ámsterdam", Reykjavik: "Reikiavik", Reykjavík: "Reikiavik", Marrakesh: "Marrakech", Jerusalem: "Jerusalén",
  "Tel Aviv": "Tel Aviv", Bucharest: "Bucarest", Belgrade: "Belgrado", Ljubljana: "Liubliana", Basel: "Basilea", Antwerp: "Amberes",
  Gothenburg: "Gotemburgo", Helsinki: "Helsinki", Oslo: "Oslo", Bergen: "Bergen", Porto: "Oporto", Malaga: "Málaga", Cordoba: "Córdoba",
  Cusco: "Cusco", Bogota: "Bogotá", Panama: "Panamá", "Panama City": "Ciudad de Panamá", Quito: "Quito", Asuncion: "Asunción", Asunción: "Asunción",
  "Rio De Janeiro": "Río de Janeiro", "Rio de Janeiro": "Río de Janeiro", Brasilia: "Brasilia", Fortaleza: "Fortaleza", Salvador: "Salvador",
  "New Orleans": "Nueva Orleans", "Los Angeles": "Los Ángeles", "San Francisco": "San Francisco", Toronto: "Toronto", Montreal: "Montreal",
  "Buenos Aires": "Buenos Aires", Bali: "Bali", Denpasar: "Denpasar (Bali)", Phuket: "Phuket", "Hong Kong": "Hong Kong", Taipei: "Taipéi",
  "Kuala Lumpur": "Kuala Lumpur", Hanoi: "Hanói", "Ho Chi Minh City": "Ciudad Ho Chi Minh", Delhi: "Delhi", "New Delhi": "Nueva Delhi", Mumbai: "Bombay",
  Sydney: "Sídney", Melbourne: "Melbourne", Auckland: "Auckland", Doha: "Doha", "Abu Dhabi": "Abu Dabi", Muscat: "Mascate", Valletta: "La Valeta",
};

const regular = airports.filter((a) => a.scheduled_service === "yes" && /^[A-Z]{3}$/.test(a.iata_code ?? "") && a.municipality);
const out = {
  // [IATA, nombre, ciudad, código de país, lat, lng, grande(1)/mediano(0), palabras clave (p. ej. «Montevideo» para MVD)]
  airports: regular.map((a) => [
    a.iata_code,
    a.name,
    ES_CITY[a.municipality] ?? a.municipality,
    a.iso_country,
    Math.round(+a.latitude_deg * 1000) / 1000,
    Math.round(+a.longitude_deg * 1000) / 1000,
    a.type === "large_airport" ? 1 : 0,
    (a.keywords ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k && /^[\p{L} .'-]+$/u.test(k) && k.length < 40)
      .map((k) => ES_CITY[k] ?? k)
      .slice(0, 3)
      .join(","),
  ]),
  // código de país → nombre en español
  countries: Object.fromEntries([...new Set(countries.map((c) => c.code))].map((cc) => [cc, countryName(cc)])),
};
writeFileSync(path.join(process.cwd(), "src", "data", "places.json"), JSON.stringify(out));
console.log(`✓ ${out.airports.length} aeropuertos, ${Object.keys(out.countries).length} países`);
