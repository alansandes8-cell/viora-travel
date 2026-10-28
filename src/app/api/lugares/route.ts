import { NextResponse } from "next/server";
import { searchAirports, searchPlaces } from "@/server/places";

/** Autocompletado de aeropuertos (salida) y de ciudades/países (destinos conocidos o pendientes). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const results = url.searchParams.get("tipo") === "aeropuertos" ? searchAirports(q) : await searchPlaces(q);
  return NextResponse.json(results, { headers: { "Cache-Control": "public, max-age=3600" } });
}
