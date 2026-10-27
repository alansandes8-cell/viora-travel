# VIORA TRAVEL

Plataforma de planificación de viajes personalizados: el cliente cuenta su viaje soñado, recibe tres alternativas razonadas con itinerario, mapa e imágenes, y pide una cotización. La agencia trabaja cada proyecto desde un panel privado con todo lo necesario para investigar, cotizar y vender.

- **Experiencia del cliente**: portada, cuestionario de 9 pasos con autoguardado, alternativas, comparador, itinerario día por día, mapa, enlace privado, PDF, resumen para WhatsApp y solicitud de cotización. **Nunca muestra precios.**
- **Panel de la agencia**: dashboard, proyectos (CRM), perfil declarado vs. inferido, editor del itinerario con bloqueo de cambios manuales, verificación de datos, componentes a cotizar, consultas de precios, presupuesto con margen, propuesta comercial con precios (documento independiente), tareas, notas, versiones, enlaces e informes (PDF, Excel, CSV, JSON).

Documentación:

| Documento | Contenido |
|---|---|
| [`docs/fase-1-analisis-y-plan.md`](docs/fase-1-analisis-y-plan.md) | Análisis y plan original (Fase 1) |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Arquitectura implementada, modelo de datos, seguridad, IA e integraciones |
| [`docs/DESPLIEGUE-GRATIS.md`](docs/DESPLIEGUE-GRATIS.md) | **Paso a paso para ponerla en línea gratis** (Oracle Cloud + DuckDNS + copias en Google Drive) |
| [`docs/DESPLIEGUE-GOOGLE-CLOUD.md`](docs/DESPLIEGUE-GOOGLE-CLOUD.md) | Alternativa gratis si Oracle rechaza el alta (Google Cloud e2-micro + DuckDNS) |
| [`docs/ESTADO.md`](docs/ESTADO.md) | Qué está completo, qué se probó (con resultados), qué falta, costos y riesgos |

---

## Requisitos

- Node.js 22 y pnpm 10 (`corepack enable`).
- PostgreSQL 16.
- Opcional: Chromium (para PDF; la imagen Docker lo incluye) y Docker para desplegar.

## Instalación local

```bash
pnpm install                          # también copia el worker del mapa a public/vendor
cp .env.example .env                  # completar DATABASE_URL, DATABASE_URL_PUBLIC, PUBLIC_DB_PASSWORD, SESSION_SECRET
```

Crear la base (una vez):

```sql
CREATE ROLE viora LOGIN PASSWORD 'clave' CREATEROLE;
CREATE DATABASE viora OWNER viora;
```

```bash
pnpm db:setup                         # migraciones + rol público restringido + estados + biblioteca de destinos
pnpm admin:create --email vos@dominio.com --name "Tu nombre" --role owner
pnpm demo:seed                        # opcional: 3 proyectos de DEMOSTRACIÓN (marcados como tales)
pnpm dev                              # http://localhost:3000  ·  panel: /admin
```

`admin:create` genera una contraseña aleatoria y la muestra una sola vez (o usa `ADMIN_PASSWORD`). Después del primer ingreso activá la verificación en dos pasos en **Ajustes**.

## Pruebas

```bash
pnpm typecheck                         # TypeScript
pnpm lint
pnpm test                              # motor, escenarios, precios, saneador (+ aislamiento de base si DATABASE_URL_PUBLIC está definida)
pnpm build && pnpm start               # producción local
E2E_BASE_URL=http://127.0.0.1:3000 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… pnpm test:e2e
```

Las pruebas de punta a punta generan muchas propuestas seguidas: si chocan con el límite anti-abuso (15 por hora por IP), subilo en **Ajustes → Generales** en el entorno de pruebas.

## Despliegue (servidor propio)

Pensado para un VPS con Docker (por ejemplo, de 2 GB de RAM). Para hacerlo sin costo, seguí [`docs/DESPLIEGUE-GRATIS.md`](docs/DESPLIEGUE-GRATIS.md) (Oracle Cloud Always Free); los scripts de `deploy/` automatizan la instalación.

1. Apuntar el dominio (registro A) a la IP del servidor.
2. En el servidor:
   ```bash
   git clone <repositorio> viora && cd viora
   cp .env.example .env    # completar DOMAIN, APP_URL, DB_PASSWORD, PUBLIC_DB_PASSWORD, SESSION_SECRET
   docker compose up -d --build
   docker compose run --rm setup pnpm admin:create --email vos@dominio.com --name "Tu nombre" --role owner
   ```
3. Caddy obtiene el certificado HTTPS automáticamente. El servicio `backup` guarda un volcado diario en `./backups` (14 días). **Copiá esa carpeta fuera del servidor** (por ejemplo, con `rclone` a un almacenamiento externo).

Actualizar: `git pull && docker compose up -d --build` (las migraciones corren solas en el servicio `setup`).

### Restaurar una copia

```bash
docker compose stop app
docker compose exec -T db pg_restore -U viora -d viora --clean --if-exists < backups/viora-AAAA-MM-DD.dump
docker compose start app
```

Probá una restauración en un servidor de prueba al menos una vez antes de depender de las copias.

## Servicios externos y credenciales

Todo funciona sin claves externas: el motor de recomendación es determinista y cada integración faltante aparece como **no configurada** en **Ajustes**, con una alternativa manual.

| Servicio | Variable | Costo | Sin configurar |
|---|---|---|---|
| IA (Claude) | `ANTHROPIC_API_KEY` | Pago por uso (aprox. US$ 1 por propuesta con textos mejorados; estimación a medir) | Motor determinista y textos por plantilla; pedidos de cambio por reglas |
| Email (SMTP, por ejemplo Gmail con contraseña de aplicación) | `SMTP_*` | Gratis | Solicitudes registradas en el panel; nunca se informa como enviado |
| Imágenes Unsplash / Pexels | `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY` | Gratis con registro | Wikimedia Commons (sin clave) o reemplazo visual |
| Videos YouTube | `YOUTUBE_API_KEY` | Cuota gratuita diaria | Enlace de búsqueda en YouTube |
| Mapa | `NEXT_PUBLIC_MAP_STYLE_URL` | OpenFreeMap gratuito | Mapa esquemático (SVG) |
| Vuelos / hoteles | — | — | Enlaces de búsqueda y carga manual con fuente |

## Diagnóstico de errores frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `DATABASE_URL_PUBLIC es obligatoria en producción` | Falta el rol público | Definí `PUBLIC_DB_PASSWORD`, corré `pnpm db:setup` y configurá `DATABASE_URL_PUBLIC` |
| El PDF abre el diálogo de impresión en lugar de descargarse | No hay Chromium | Usar la imagen Docker o definir `CHROMIUM_PATH` |
| «Hiciste muchas consultas seguidas» | Límite anti-abuso por IP | Ajustar en **Ajustes → Generales** |
| El mapa se ve como esquema | El proveedor de teselas no responde o está deshabilitado | Revisar `NEXT_PUBLIC_MAP_STYLE_URL` (se toma al compilar) |
| Sin imágenes | Proveedores sin clave o bloqueados | Configurar Unsplash/Pexels; Wikimedia funciona sin clave |
| No puedo ingresar al panel | 5 intentos fallidos bloquean la cuenta por 15 minutos | Esperar o regenerar la contraseña con `admin:create` |
