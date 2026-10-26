// Copia el worker de MapLibre a /public para servirlo como archivo estático (compatible con cualquier bundler).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const src = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
mkdirSync("public/vendor", { recursive: true });
copyFileSync(src, "public/vendor/maplibre-gl-worker.mjs");
console.log("✓ maplibre-gl-worker.mjs copiado a public/vendor");
