import "server-only";
import { existsSync } from "node:fs";
import { signPayload } from "./security";

const CANDIDATES = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];

export function chromiumPath(): string | null {
  for (const c of CANDIDATES) if (c && existsSync(/* turbopackIgnore: true */ c)) return c;
  return null;
}

/** Redirección con ruta relativa (el navegador la resuelve contra el dominio público). */
export function relativeRedirect(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
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
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote", "--disable-crash-reporter", "--disable-breakpad", "--no-first-run"], timeout: 20000 });
  try {
    const page = await browser.newPage();
    // «networkidle» puede no llegar nunca si un sitio externo de fotos o mapas tarda: se espera
    // a que cargue la página y, como mucho 8 s más, a que terminen las imágenes.
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page
      .waitForFunction(() => Array.from(document.images).every((i) => i.complete), undefined, { timeout: 8000 })
      .catch(() => {});
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "14mm", left: "10mm", right: "10mm" } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
