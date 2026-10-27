// Arma una página HTML única con el motor real de VIORA (src/core) y la interfaz de vista previa.
// React se carga desde cdnjs; el resto queda incluido en la página.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = process.argv[2] ?? path.join(root, "preview", "dist.html");

const globals = {
  name: "globals",
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/client)?$/ }, (a) => ({ path: a.path, namespace: "g" }));
    b.onLoad({ filter: /.*/, namespace: "g" }, (a) => ({ contents: `module.exports = ${a.path.startsWith("react-dom") ? "window.ReactDOM" : "window.React"};`, loader: "js" }));
  },
};

const res = await build({
  entryPoints: [path.join(root, "preview", "app.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  alias: { "@": path.join(root, "src") },
  plugins: [globals],
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  tsconfigRaw: { compilerOptions: { jsx: "react", jsxFactory: "React.createElement", jsxFragmentFactory: "React.Fragment" } },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(root, "preview", "styles.css"), "utf8");
const logo = "data:image/webp;base64," + readFileSync(path.join(root, "public", "brand", "viora-logo.webp")).toString("base64");

const html = `<title>VIORA TRAVEL</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Nunito+Sans:wght@400;600;700;800&display=swap">
<style>${css}</style>
<div id="app"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>var LOGO_SRC=${JSON.stringify(logo)};</script>
<script>${js}</script>
`;
writeFileSync(out, html);
console.log(`✓ ${out} (${Math.round(html.length / 1024)} KB)`);
