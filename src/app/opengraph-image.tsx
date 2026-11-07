import { ImageResponse } from "next/og";

export const alt = "VIORA TRAVEL — Agencia de viajes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que aparece al compartir la web en WhatsApp, Facebook, etc. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #1b2a4a 0%, #12a59b 100%)", color: "white" }}>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: 8 }}>VIORA</div>
        <div style={{ fontSize: 30, letterSpacing: 18, marginTop: -6, opacity: 0.85 }}>TRAVEL</div>
        <div style={{ fontSize: 54, fontWeight: 700, marginTop: 50, lineHeight: 1.15 }}>Viajar puede ser complicado.</div>
        <div style={{ fontSize: 54, fontWeight: 700, color: "#f6a01a" }}>Con nosotros, es fácil.</div>
        <div style={{ fontSize: 28, marginTop: 30, opacity: 0.9 }}>Paquetes · Vuelos · Hoteles · Excursiones · Viajes a medida</div>
      </div>
    ),
    size,
  );
}
