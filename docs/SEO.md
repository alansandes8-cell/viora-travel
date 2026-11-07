# SEO: cómo aparecer en Google

## Lo que ya hace la web (automático)

- **Mapa del sitio** en `/sitemap.xml`: home, paquetes, más de 60 guías de destinos, vuelos, hoteles y actividades. Se actualiza solo cuando publicás un paquete.
- **robots.txt**: Google recorre todo lo público y nunca el panel, los viajes de los clientes ni los enlaces privados.
- **Guías de destinos** (`/destinos/...`): una página por destino con mejor época (tabla por mes), cuánto cuesta desde Argentina, qué hacer, dónde alojarse, qué comer, preguntas frecuentes y formulario de presupuesto. Son las páginas que pueden posicionar búsquedas como «viajar a Roma desde Argentina», «mejor época para ir a Punta Cana» o «cuánto cuesta viajar a Orlando».
- **Títulos y descripciones** pensados para búsquedas reales en cada página, con dirección canónica (evita contenido duplicado).
- **Datos estructurados** (schema.org): agencia de viajes, sitio web, destinos turísticos, paquetes (con precio si lo cargaste), migas de pan y preguntas frecuentes.
- **Imagen para compartir** en WhatsApp/Facebook (`/opengraph-image`) y por destino/paquete.
- **Enlaces internos**: home → destinos más buscados → guías → vuelos/hoteles/actividades/paquetes.

## Lo que tenés que hacer vos (una sola vez, 20 minutos)

1. **Google Search Console** — https://search.google.com/search-console
   - «Agregar propiedad» → **Dominio** → `viora-travel.com`.
   - Te da un registro **TXT**: copialo en GoDaddy → DNS → Agregar registro → Tipo TXT, Nombre `@`, Valor: el texto que te dio Google. Esperá unos minutos y tocá «Verificar».
   - (Alternativa: método «Etiqueta HTML»; copiá solo el código de `content="…"` en `.env` como `GOOGLE_SITE_VERIFICATION=...` y actualizá el servidor.)
   - En el menú **Sitemaps**, escribí `sitemap.xml` y Enviar.
   - En **Inspección de URLs**, pegá `https://viora-travel.com/` y tocá «Solicitar indexación». Repetí con 5 o 6 guías importantes (Orlando, Punta Cana, Madrid, Roma…).
2. **Perfil de empresa de Google** — https://business.google.com : creá «VIORA TRAVEL» (categoría *Agencia de viajes*), con el enlace a la web, WhatsApp, horario y fotos. Pedí reseñas a tus clientes ahí: es lo que más pesa para búsquedas locales («agencia de viajes en …»).
3. En `.env` del servidor completá `SOCIAL_LINKS` (Instagram, Facebook, TikTok) y, si tienen, `AGENCY_LEGAL_ID` y `AGENCY_ADDRESS`. Después `bash deploy/actualizar.sh`.

## Lo que hace subir posiciones con el tiempo

- **Paciencia:** un dominio nuevo tarda entre 1 y 6 meses en posicionar. Las búsquedas de nicho (guías) llegan primero; «agencia de viajes» a secas es de las más competidas y lleva más tiempo.
- **Enlaces desde otros sitios:** pedí que te enlacen proveedores, operadores, la cámara de turismo, medios locales o blogs de viaje. Poné la web en la bio de Instagram, TikTok y en cada publicación.
- **Reseñas reales** en Google y opiniones en la web.
- **Contenido nuevo y real:** cada paquete publicado es una página más. Actualizá precios y salidas.
- **Medir:** en Search Console mirá cada mes qué búsquedas te muestran y en qué posición; las que están entre el puesto 5 y 20 son las primeras para mejorar.

Lo que **no** hay que hacer: comprar enlaces, copiar textos de otras webs, inventar reseñas o rellenar páginas con palabras clave. Google lo penaliza y puede sacar la web de los resultados.
