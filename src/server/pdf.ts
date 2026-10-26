import "server-only";
import { existsSync } from "node:fs";
import { signPayload } from "./security";

const CANDIDATES = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];

export function chromiumPath(): string | null {
  for (const c of CANDIDATES) if (c && existsSync(/* turbopackIgnore: true */ c)) return c;
  return null;
}

/** URL interna firmada (5 minutos) para que el navegador sin interfaz renderice la versión imprimible. */
export function signedPrintUrl(path: string, payload: string): string {
  const { exp, sig } = signPayload(payload);
  const base = (process.env.INTERNAL_APP_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`).replace(/\/$/, "");
  return `${base}${path}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

/**
 * Genera un PDF con Chromium. Si no hay navegador disponible devuelve null y la ruta
 * ofrece la alternativa de imprimir desde el navegador del usuario (Guardar como PDF).
 */
export async function renderPdf(url: string): Promise<Buffer | null> {
  const exe = chromiumPath();
  if (!exe) return null;
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
