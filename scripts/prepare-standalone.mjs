// Copia archivos estáticos al paquete "standalone" para ejecutarlo sin el código fuente.
import { cpSync, existsSync } from "node:fs";

if (existsSync(".next/standalone")) {
  cpSync("public", ".next/standalone/public", { recursive: true });
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  console.log("✓ standalone listo (.next/standalone/server.js)");
}
