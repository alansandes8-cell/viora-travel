# Arquitectura implementada

> Complementa el plan de la Fase 1 ([`fase-1-analisis-y-plan.md`](fase-1-analisis-y-plan.md)). Al final se listan las diferencias con ese plan y su motivo.

## Visión general

Monolito modular en TypeScript sobre Next.js 16 (App Router) y PostgreSQL 16. El dominio vive en código puro y testeable (`src/core`). El servidor (`src/server`) orquesta la base de datos, la IA y las integraciones. La interfaz (`src/app`, `src/components`) solo consume servicios.

```
src/
├─ core/                 Dominio puro (sin red ni base): se prueba con Vitest
│  ├─ types.ts           Tipos: cuestionario, perfil, plan versionado, Claim<T> con estado de verificación
│  ├─ catalog.ts         Estilos de viaje, prioridades, niveles de presupuesto, ponderaciones base
│  ├─ library/           Biblioteca semilla: 60 destinos y 231 actividades, conexiones conocidas, enlaces oficiales de requisitos
│  ├─ profile.ts         Cuestionario → perfil (declarado / inferido / faltante)
│  ├─ questions.ts       Preguntas inteligentes del paso 9 (solo las de alto impacto, sin repetir)
│  ├─ candidates.ts      Candidatos: destino único, combinaciones y rutas multidestino por región
│  ├─ scoring.ts         Puntaje transparente por 10 criterios con factores a favor y en contra
│  ├─ nights.ts          Distribución determinista de noches (suma exacta, valor marginal, quita paradas antes que comprimir)
│  ├─ itinerary.ts       Itinerario día por día, traslados, alojamiento (sin inventar hoteles), enlaces de vuelos
│  ├─ validators.ts      Coherencia: noches, fechas, retrocesos geográficos, traslados, sobrecarga, temporada
│  ├─ plan.ts            Orquestación: 3 alternativas diversas, etiquetas derivadas, comparación estacional
│  ├─ changes.ts         Pedidos de cambio → operaciones acotadas; respeta elementos bloqueados
│  ├─ sanitize.ts        Vista del cliente por lista blanca + escáner de importes
│  ├─ pricing.ts         Presupuesto con decimal.js (sin supuestos de margen, impuestos ni tipo de cambio)
│  └─ diff.ts            Diferencias legibles entre versiones
├─ server/
│  ├─ db/                Esquema Drizzle (public + internal), conexión principal y conexión pública restringida
│  ├─ auth/              Contraseñas scrypt, sesiones en base, 2FA TOTP, requireStaff()
│  ├─ ai/claude.ts       Capa de IA opcional (textos, pedidos libres, revisión crítica, investigación con fuentes)
│  ├─ integrations/      Imágenes (Unsplash, Pexels, Wikimedia), videos (YouTube), email SMTP
│  ├─ services/          Flujo del cliente, proyectos/versiones/enlaces, panel
│  ├─ pdf.ts, exports.ts PDF con Chromium, XLSX/CSV
│  └─ security.ts        Tokens, firmas temporales, límites de tasa
├─ app/(public)          Portada, /planificar, /viaje/*, /p/[token], páginas legales
├─ app/admin             Login y panel (/admin/*)
└─ app/print             Versiones imprimibles con firma temporal (para PDF)
```

## Flujo principal

1. **Cuestionario** (`/planificar`): el estado se autoguarda en `intake_sessions`, identificado por una cookie `HttpOnly` con un token aleatorio. En la base solo se guarda el hash del token. El monto del presupuesto no se autoguarda: viaja únicamente en el envío final y se almacena en `internal.budget_hints`.
2. **Generación**: `submitIntake` valida con Zod, aplica el límite por IP, ejecuta el motor determinista (unos 20 ms), crea el proyecto (`VIO-AAAA-NNNN`), la versión 1, las tareas y los componentes a cotizar, y publica una **instantánea saneada**. Si hay clave de IA, en segundo plano (`after()`) se redactan textos personalizados como versión nueva, sin pisar cambios posteriores.
3. **Cliente** (`/viaje/*`): lee **solo** la última instantánea, con la conexión de base pública restringida. Elegir una alternativa o pedir un cambio crea una versión nueva y una nueva instantánea.
4. **Agencia** (`/admin`): edita sobre la versión actual. Si la versión actual es un borrador del agente, se actualiza en el lugar; si no, se crea una versión nueva. **Aprobar y publicar** genera la instantánea «revisada por VIORA».
5. **Cotización**: componentes, consultas de precios (con tipo de dato, fecha, fuente y vigencia), presupuesto con fórmulas visibles y propuesta comercial con precios como **documento independiente** (instantánea `priced_proposal` con su propio enlace).

## Modelo de datos

**Esquema `public`**: `staff_users`, `staff_sessions`, `clients`, `project_statuses` (editables), `trip_projects`, `intake_sessions`, `plan_versions` (documento JSON por versión), `change_requests`, `tasks`, `client_snapshots`, `share_links` (hash del token, vencimiento, revocación y accesos), `quote_requests`, `activity_log`, `destinations` (biblioteca editable), `media_assets` y `media_queries` (atribución y caché), `link_checks`, `settings`, `rate_limits`.

**Esquema `internal`**: `notes`, `budget_hints`, `quote_components`, `price_observations`, `quotes`, `quote_lines`, `ai_runs`.

El plan es un documento JSON inmutable por versión publicada. Cada elemento tiene `id` estable, `origin` (motor, IA, agente o cliente) y `locked`. Los datos fácticos usan `Claim<T>` con estado: verificado, oficial general, estimación, recomendación, pendiente o no disponible.

## Seguridad: cómo se garantiza que el cliente no vea precios

1. **Datos**: los importes existen solo en el esquema `internal`. El documento del plan no tiene campos de importes.
2. **Base de datos**: las páginas públicas usan el rol `viora_public`, que solo puede leer `client_snapshots`, `media_*` y algunas columnas de `share_links` e `intake_sessions`. No tiene acceso al esquema `internal` ni a proyectos, clientes, versiones o respuestas. Lo verifica `tests/integration/db-roles.test.ts`.
3. **Instantáneas**: `toClientProposal` copia por lista blanca y el escáner `scanForMoney` elimina textos con importes. Si algo se filtra igual, la publicación falla.
4. **Edición**: los textos para el cliente que escribe el agente se rechazan si contienen importes.
5. **IA**: la redacción para el cliente no recibe importes, y su salida pasa por el escáner.
6. **Pruebas**: Vitest (escenario 18) y Playwright (HTML y texto visible de la página pública).

Además: `requireStaff()` en cada página y acción del panel (el `proxy` es solo una primera barrera); roles propietario, agente y solo lectura; contraseñas scrypt; bloqueo tras 5 intentos; 2FA TOTP; cookies `HttpOnly` y `SameSite`; tokens de 192 a 256 bits; enlaces con vencimiento y revocación; firmas HMAC temporales para las vistas imprimibles; validación Zod; límites de tasa en Postgres; cabeceras de seguridad, `noindex` y `no-referrer` en enlaces privados; CSV protegido contra inyección de fórmulas. El texto del cliente se envía a la IA como dato delimitado y nunca como instrucción.

## IA

Es opcional. Con `ANTHROPIC_API_KEY`, se usa `claude-opus-5-5` (configurable con `AI_MODEL`) con salidas estructuradas validadas por Zod y respaldo automático ante rechazos. Se usa para:

- textos personalizados de la propuesta (en segundo plano);
- interpretar pedidos de cambio libres como operaciones acotadas (los ids se verifican);
- revisión crítica a pedido del agente;
- investigación con búsqueda web y citas, a pedido del agente; se guarda como nota con fecha y fuentes.

Hay un límite diario configurable y cada llamada queda registrada en `internal.ai_runs`. La IA nunca calcula noches, fechas, puntajes ni precios.

## Integraciones

Cada proveedor es un adaptador independiente que informa si está configurado. Imágenes: Unsplash, después Pexels, después Wikimedia Commons (solo licencias libres explícitas), con caché de 30 días y atribución guardada. Se usan las URLs originales, sin re-alojar. Videos: YouTube con el reproductor oficial (`youtube-nocookie`). Mapa: MapLibre con teselas configurables y, como respaldo, un mapa esquemático en SVG. Email: SMTP. Vuelos y hoteles: sin API en esta versión (ver [`ESTADO.md`](ESTADO.md)).

## Diferencias con el plan de la Fase 1

| Plan | Implementado | Motivo |
|---|---|---|
| Monorepo con paquetes | Una aplicación con módulos separados por carpeta (`core` puro, `server`, `app`) | Menos configuración para un equipo de una persona; `core` no depende de Next y se puede extraer después |
| Cola pg-boss + proceso aparte | `after()` de Next para tareas en segundo plano (IA) y generación inmediata | El motor determinista tarda unos 20 ms; la única tarea lenta (IA) es opcional. Agregar una cola es posible sin rediseñar |
| Better Auth | Autenticación propia: scrypt, sesiones en base y TOTP | Un solo administrador inicial; menos dependencias y control total. Las sesiones y los roles están en tablas propias |
| Almacenamiento S3 / R2 | No hace falta por ahora | Los PDF se generan al vuelo; los medios se enlazan desde los proveedores |
| Railway / Render | Docker Compose en servidor propio (Caddy y copias diarias) | Pedido de la agencia: servidor propio y costo mínimo |
