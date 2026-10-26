# VIORA TRAVEL — Fase 1: Análisis y planificación integral

> Documento vivo. Versión 1.0 — 26/10/2026.
> Alcance: análisis de requisitos, arquitectura, modelo de datos, integraciones, costos, seguridad, diseño de experiencia, panel privado, prioridades y criterios de aceptación.
> Todavía no se escribió código de producto. Las cifras de costos de terceros son referencias consultadas en la fecha indicada y **deben reverificarse antes de contratar**.

---

## 0. Resumen ejecutivo

VIORA TRAVEL será un **sistema de planificación de viajes** con dos caras que comparten un mismo núcleo:

1. **Experiencia del cliente** (pública, sin registro obligatorio): cuestionario progresivo e inteligente → tres alternativas razonadas → comparador → itinerario con mapa, imágenes y videos → guardar/compartir con enlace privado → pedir cotización. **Nunca ve importes.**
2. **Panel de la agencia** (privado, con autenticación y roles): CRM de proyectos, perfil declarado vs. inferido, puntajes con criterios, itinerario editable con bloqueos manuales, control de verificación de cada dato, componentes a cotizar, cotizaciones reales, presupuesto con margen, tareas, notas, versiones y exportaciones.

Decisiones centrales:

| Tema | Decisión |
|---|---|
| Forma del sistema | **Monolito modular en TypeScript** (monorepo), con núcleo de dominio puro y adaptadores reemplazables. Se puede separar en servicios más adelante sin reescribir. |
| Web | **Next.js (App Router)**: SSR para páginas compartibles, rutas públicas y privadas en grupos separados. |
| Datos | **PostgreSQL** + **Drizzle ORM** (migraciones SQL versionadas). |
| Trabajos en segundo plano | **pg-boss** (cola sobre el mismo Postgres; no requiere Redis). Proceso *worker* separado. |
| IA | **Claude API** detrás de una interfaz `LlmProvider`. La IA propone; **algoritmos deterministas** calculan noches, fechas, puntajes, distancias y validan. |
| Separación de precios | Cuatro capas: esquema `internal` en la base, **rol de base de datos restringido** para las vistas públicas, **instantáneas saneadas** (lista blanca + escáner de importes) y pruebas automáticas. |
| Integraciones | Patrón *puerto/adaptador* por dominio (vuelos, hoteles, clima, mapas, imágenes, videos, cambio, requisitos). Si no hay credencial → estado **"no configurado"** visible + **flujo manual**. Nunca datos simulados en producción. |
| PDF | HTML de impresión renderizado con Chromium (Playwright) en el *worker*: el mismo diseño que la web. |
| Mapa | **MapLibre GL** con proveedor de teselas configurable; alternativa sin API: diagrama de ruta SVG generado a partir de coordenadas. |

---

## 1. Análisis de requisitos

### 1.1. Funcionalidades obligatorias (MVP de punta a punta)

Tomadas de las secciones 21 (Fase 3) y 23 del pedido. Todas entran en el MVP:

1. Iniciar planificación sin registro.
2. Cuestionario progresivo de 9 pasos con preguntas condicionales y autoguardado.
3. Perfil de viaje estructurado (declarado vs. inferido vs. faltante).
4. Tres alternativas razonadas con puntaje explicable y ponderaciones adaptadas.
5. Comparador visual de alternativas (escritorio y celular), incluida comparación estacional cuando hay flexibilidad.
6. Itinerario día por día con distribución de noches y validación logística.
7. Imágenes y videos con atribución, carga diferida y reemplazo ante fallas.
8. Mapa de ruta (o alternativa funcional).
9. Persistencia del proyecto y continuidad entre dispositivos (enlace privado).
10. Panel privado con autenticación, roles y CRM básico.
11. Edición manual con bloqueo de cambios del agente y versionado.
12. Informe del cliente sin precios (web compartible, PDF, vista celular, resumen para WhatsApp).
13. Informe interno (PDF, vista estructurada, hoja de cálculo, lista de componentes, enlaces de investigación).
14. Tareas de cotización con estados.
15. Enlaces privados con vencimiento y revocación.
16. Registro de solicitudes de cotización vinculadas al proyecto.
17. Carga de cotizaciones reales, presupuesto interno con margen editable y propuesta comercial presupuestada independiente.
18. Pruebas de los 18 escenarios de la sección 20.

### 1.2. Funcionalidades que entran en arquitectura pero se habilitan progresivamente

No se eliminan: quedan con interfaz definida y modo manual en el MVP.

| Funcionalidad | MVP | Después |
|---|---|---|
| Búsqueda de vuelos en vivo | Enlaces de consulta prearmados + carga manual de tarifas observadas | Adaptador Duffel (u otro) |
| Búsqueda de hoteles en vivo | Sugerencias de zonas/categorías + hoteles cargados por el agente o investigados con fuente | Adaptador LiteAPI / Hotelbeds / Expedia Rapid |
| Requisitos migratorios automáticos | Enlaces oficiales por país + tarea de verificación | Proveedor pago tipo Timatic / Sherpa |
| Notificaciones y recordatorios | Fechas de seguimiento visibles en el panel | Email/WhatsApp Business |
| Cuentas de cliente | Enlace privado + "continuar en otro dispositivo" | Login con enlace mágico y reutilización de preferencias con consentimiento |
| Alertas de cambios | — | Cuando haya fuentes compatibles |
| Plantillas de viaje, biblioteca ampliada, viajes grupales complejos, cruceros | Modelo de datos preparado (tipos de etapa: ciudad, crucero, ruta) | Pantallas específicas |

### 1.3. Ambigüedades detectadas y decisión propuesta

| # | Ambigüedad | Decisión por defecto (modificable) |
|---|---|---|
| A1 | ¿El cliente ve la propuesta generada por IA en el momento, o solo después de que la revise un agente? | Ve una **"propuesta preliminar"** al instante, claramente rotulada. El agente luego publica una **"propuesta revisada por VIORA"** como versión nueva. *(Pregunta abierta Q1.)* |
| A2 | ¿Puede el cliente ver su propio presupuesto declarado? | No se muestran importes en la vista del cliente, **ni siquiera los que él cargó**. Se muestra el nivel ("moderado", "flexible"). Así la regla "sin cifras" es absoluta y verificable automáticamente. |
| A3 | La propuesta comercial presupuestada también la recibe el cliente. | Es un **documento distinto**, con otro tipo de enlace, otra instantánea y generado solo desde una cotización aprobada por el agente. La propuesta inspiracional jamás se mezcla con ella. |
| A4 | "Investigar" con IA tiene costo. | La investigación web **la dispara el agente** (botón "Investigar"), con límite por proyecto. La experiencia del cliente usa la biblioteca de destinos + razonamiento de IA, sin búsquedas externas costosas automáticas. |
| A5 | Datos de destinos (clima, temporadas, cierres). | Se apoya en una **biblioteca de destinos curada por la agencia**, con fuente y fecha por dato. La IA puede proponer destinos fuera de la biblioteca, rotulados "requiere investigación". |
| A6 | Usuarios internos. | Roles: **propietario**, **agente**, **solo lectura**. Un agente ve todos los proyectos o solo los asignados (configurable). |

### 1.4. Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La IA inventa hoteles, conexiones o datos climáticos | Alto (confianza y reputación) | Cada dato es un `Claim` con estado de verificación; hoteles solo de biblioteca, de proveedor o con URL fuente; validadores deterministas; revisión crítica; rótulos visibles. |
| Filtración de precios al cliente | Alto | Defensa en profundidad (§7.3) + pruebas automáticas que fallan el *build*. |
| Dependencia de un proveedor de APIs | Medio | Puertos/adaptadores; ya ocurrió: **Amadeus cerró su portal Self-Service el 17/07/2026** ([PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers), [Ignav](https://ignav.com/docs/amadeus-self-service-shutdown)). |
| Costos de IA no controlados | Medio | Presupuesto por proyecto, cacheo de *prompts*, recálculo parcial, límites por IP/sesión, tablero de consumo. |
| Licencias de imágenes/videos | Medio | Solo APIs con licencia explícita, atribución guardada por recurso, *embed* oficial para videos, sin re-alojar contenido ajeno. |
| Itinerarios "genéricos" | Medio (valor del producto) | Puntaje ponderado por prioridades, exclusión de destinos conocidos, reglas de ritmo, evaluación con escenarios de prueba. |
| Requisitos migratorios erróneos | Alto | Nunca se afirman como garantía; siempre enlace oficial + tarea "verificar"; depende de nacionalidad declarada. |
| Abuso del cuestionario público (bots que consumen IA) | Medio | Límite de tasa, *captcha* invisible (Cloudflare Turnstile) antes de generar, tope diario global. |

---

## 2. Arquitectura propuesta

### 2.1. Alternativas evaluadas

| Opción | Ventajas | Desventajas | Veredicto |
|---|---|---|---|
| **A. Monolito modular TS (Next.js + worker + Postgres)** | Un lenguaje, un despliegue, tipos compartidos entre front y back, bajo costo inicial, fácil de mantener para un equipo chico | Hay que disciplinar los límites entre módulos | **Elegida** |
| B. SPA (React) + API separada (NestJS/FastAPI) | Separación explícita | Dos despliegues, duplicación de tipos/validaciones, más costo y fricción para una agencia | Descartada por ahora; la opción A permite extraer la API luego |
| C. Plataforma *no-code* / BaaS (Supabase/Firebase + front) | Velocidad inicial | Lógica de dominio compleja (puntajes, validadores, versionado, separación de precios) queda dispersa; dependencia fuerte | Descartada |
| D. Python (Django) + front aparte | Ecosistema de datos | Dos lenguajes; menor reutilización de validaciones en el navegador | Descartada |

### 2.2. Vista de componentes

```
┌──────────────────────────── apps/web (Next.js) ─────────────────────────────┐
│  (public)  Portada · Cuestionario · Resultados · Comparador · Itinerario     │
│            Propuesta compartida /p/[token]  ← solo lee instantáneas saneadas │
│  (admin)   Dashboard · Proyectos · Cliente · Editor · Presupuesto · Ajustes  │
│  API       /api/public/*  (sesión anónima, límites de tasa, Turnstile)       │
│            /api/admin/*   (sesión autenticada + permisos por recurso)        │
└───────────────┬──────────────────────────────────────────┬──────────────────┘
                │ casos de uso (packages/app)              │ encola trabajos
┌───────────────▼───────────────┐            ┌─────────────▼────────────────┐
│ packages/core  (dominio puro)  │            │ apps/worker (pg-boss)         │
│  tipos + esquemas Zod          │            │  generación IA, PDF, XLSX,    │
│  puntaje, noches, fechas,      │            │  investigación, medios,       │
│  validadores, diffs, saneador  │            │  limpieza y retención         │
└───────────────┬───────────────┘            └─────────────┬────────────────┘
┌───────────────▼────────────────────────────────────────────▼────────────────┐
│ packages/ai            orquestación por etapas + esquemas de salida          │
│ packages/integrations  puertos y adaptadores (vuelos, hoteles, clima, mapas, │
│                        imágenes, videos, cambio, requisitos, email)          │
│ packages/db            esquema Drizzle, migraciones, repositorios            │
│ packages/reports       plantillas HTML de impresión, XLSX, texto WhatsApp    │
└───────────────┬──────────────────────────────────────────────────────────────┘
        ┌───────▼────────┐   ┌──────────────────┐   ┌─────────────────────┐
        │ PostgreSQL     │   │ Almacenamiento S3│   │ Servicios externos   │
        │ public/internal│   │ (PDF, fotos      │   │ Claude, Unsplash,    │
        │ roles separados│   │  propias)        │   │ YouTube, mapas, etc. │
        └────────────────┘   └──────────────────┘   └─────────────────────┘
```

Reglas de dependencia (verificadas con ESLint `boundaries`):

- `core` no depende de nada externo (ni base, ni red). Es 100 % testeable.
- Las rutas públicas **no pueden importar** repositorios de `internal` ni módulos de precios.
- `integrations` solo expone interfaces; los casos de uso nunca llaman a un proveedor por nombre.

### 2.3. Tecnologías y justificación

| Componente | Elección | Por qué | Alternativa válida |
|---|---|---|---|
| Lenguaje | TypeScript estricto | Tipos compartidos de punta a punta; validación única con Zod en cliente y servidor | — |
| Monorepo | pnpm workspaces + Turborepo | Módulos con límites claros, *builds* incrementales | Nx |
| Framework web | Next.js (App Router) | SSR/SSG para propuestas compartibles y SEO de portada; *server actions* y rutas API en el mismo proyecto; gran ecosistema | Remix/React Router 7, SvelteKit |
| UI | Tailwind CSS + componentes propios sobre Radix UI primitives | Accesibilidad resuelta (diálogos, menús, pestañas), sin "look" genérico porque el diseño visual es propio | Mantine |
| Formularios | React Hook Form + Zod | Validaciones compartidas con el backend | — |
| Base de datos | PostgreSQL 16 | Relacional + JSONB para documentos de plan versionados; roles y permisos nativos para separar datos | — |
| ORM | Drizzle | SQL explícito, migraciones legibles, buen soporte de esquemas múltiples y tipos | Prisma |
| Cola de trabajos | pg-boss | Reintentos, programación y concurrencia sin infraestructura extra | BullMQ + Redis (cuando el volumen lo justifique) |
| Autenticación | Better Auth (autoalojado en Postgres) | Email+contraseña, 2FA TOTP, sesiones en base, plugin de roles; sin costo por usuario; datos en nuestra base | Auth.js; Clerk (pago, datos fuera) |
| IA | Claude API vía `@anthropic-ai/sdk`, salidas estructuradas | Razonamiento sólido en español, salidas JSON validadas por esquema, herramienta de búsqueda web con citas para la investigación del agente | Interfaz `LlmProvider` permite otro proveedor |
| Mapas | MapLibre GL JS | Libre, sin bloqueo de proveedor; teselas desde MapTiler/Stadia o **PMTiles autoalojado** (Protomaps) | Mapbox (licencia propietaria) |
| PDF | Playwright/Chromium sobre rutas HTML de impresión | Fidelidad visual idéntica a la web; un solo sistema de diseño | react-pdf (más limitado tipográficamente) |
| Hojas de cálculo | ExcelJS | XLSX con fórmulas visibles para el presupuesto | — |
| Cálculos monetarios | decimal.js (nunca `number`) | Evita errores de punto flotante en márgenes y tipos de cambio | — |
| Almacenamiento | S3 compatible (Cloudflare R2) | Sin costo de egreso; PDFs y fotos propias de la agencia | AWS S3 |
| Email | Resend o Postmark (adaptador) | API simple; si falta la clave, el sistema **no dice** que envió nada | SMTP propio |
| Antibots | Cloudflare Turnstile | Gratuito, invisible | hCaptcha |
| Observabilidad | pino (logs JSON con redacción de PII) + Sentry (con *scrubbing*) | Errores sin exponer datos personales | OpenTelemetry |
| Pruebas | Vitest (unidad/integración), Playwright (E2E), Testcontainers (Postgres real) | Cobertura del núcleo y de los flujos completos | — |
| Contenedores | Docker (web y worker) + Docker Compose para desarrollo | Mismo entorno en local y producción; Chromium incluido para PDF | — |

### 2.4. Despliegue recomendado

- **Inicio (recomendado):** Railway o Render con dos servicios Docker (web + worker) y Postgres administrado (del mismo proveedor o Neon), R2 para archivos, Cloudflare como DNS/CDN.
  Motivo: el *worker* necesita Chromium y procesos de larga duración, algo incómodo en plataformas *serverless* puras.
- **Alternativa económica:** un VPS (Hetzner/DigitalOcean) con Docker Compose + copias de seguridad automáticas a R2. Más barato, más mantenimiento.
- **Crecimiento:** separar el *worker* en más réplicas, agregar Redis/BullMQ si la cola lo requiere, réplica de lectura de Postgres.

---

## 3. Modelo de datos

### 3.1. Principio: documento de plan versionado + tablas operativas

- El **plan de viaje** (perfil, alternativas, puntajes, itinerario, alojamientos, transporte, experiencias) se guarda como **documento JSON tipado e inmutable por versión** (`plan_versions.document`). Ventajas: comparación entre versiones exacta, restauración trivial, edición parcial, sin perder historia.
- Cada elemento del documento tiene un `id` estable, `origin` (`ai` | `agent` | `client_request` | `library`), `locked` (bloqueado por el agente) y, si es un dato fáctico, un **`Claim`** con estado de verificación.
- Lo que tiene ciclo de vida propio (tareas, notas, cotizaciones, enlaces, fuentes, medios, auditoría) va en **tablas normalizadas**.

### 3.2. Tipo `Claim` (control de información, §9.2-E)

```ts
type VerificationStatus =
  | 'verified_current'     // Verificado en una fuente actual
  | 'official_general'     // Información oficial de carácter general
  | 'estimate'             // Estimación
  | 'ai_recommendation'    // Recomendación de IA
  | 'pending'              // Pendiente de confirmar
  | 'unavailable';         // No disponible

interface Claim<T> {
  value: T;
  status: VerificationStatus;
  sourceIds: string[];     // → tabla sources
  checkedAt?: string;      // fecha de consulta
  validUntil?: string;     // vigencia, si se conoce
  note?: string;
}
```

### 3.3. Entidades (esquema `public` de la app)

| Tabla | Campos clave | Notas |
|---|---|---|
| `staff_users` | id, nombre, email, rol, 2FA, activo | Gestionada por Better Auth + rol propio |
| `clients` | id, nombre, email, teléfono, país, nacionalidad (opcional, solo si hace falta para requisitos), consentimientos, origen del contacto, creado | Datos mínimos; nada sensible innecesario |
| `trip_projects` | id (uuid), código legible (`VIO-2026-0001`), client_id, nombre, status_id, prioridad comercial, agente asignado, versión actual, versión publicada, próxima tarea/fecha, archivado, **is_demo** | Un cliente → muchos proyectos |
| `project_statuses` | id, nombre, orden, color, es_final | Editables; semilla con los 10 estados pedidos |
| `intake_sessions` | id, project_id, token_hash anónimo, respuestas (JSONB con versión de esquema), paso actual, completado, expira | Autoguardado del cuestionario |
| `plan_versions` | id, project_id, número, padre, autor (ai/agent/client), motivo, **document** (JSONB), estado (borrador/aprobada/publicada), resumen de cambios, creado | Inmutables |
| `change_requests` | id, project_id, texto, origen (cliente/agente), alcance detectado, estado, versión resultante | "Quiero menos ciudades", etc. |
| `tasks` | id, project_id, título, detalle, estado (pendiente/en proceso/verificada/completada), vence, responsable, origen (sugerida por IA/manual), componente vinculado | Lista priorizada de cotización |
| `sources` | id, url, título, editor, tipo (oficial/proveedor/editorial/biblioteca), consultado_en, vigente_hasta | Reutilizable entre proyectos |
| `media_assets` | id, proveedor, id externo, tipo (imagen/video), urls, autor, url autor, licencia, texto de atribución, **es_generada_por_ia**, destino, etiquetas, verificado | Sin re-alojar videos de terceros |
| `destinations` | id, nombre, país, región, coordenadas, tipo, etiquetas, noches mínimas/ideales, aeropuertos, notas, fuentes | **Biblioteca curada** |
| `destination_seasons` | destino, mes, clima (Claim), temperatura aire/mar (Claim), lluvias, riesgos (huracanes, monzón), temporada alta/baja, eventos, cierres | Base de la comparación estacional |
| `share_links` | id, **token_hash**, version_id, tipo (`client_proposal` / `priced_proposal`), expira, revocado, último acceso, contador | El token nunca se guarda en claro |
| `client_snapshots` | id, version_id, tipo, contenido saneado (JSONB), hash, creado | Lo único que leen las páginas públicas |
| `quote_requests` | id, project_id, contacto, mensaje, canal preferido, estado de notificación (`not_configured` / `sent` / `failed`) | Nunca se informa "enviado" si no lo fue |
| `activity_log` | id, actor, acción, entidad, antes/después (sin PII sensible), fecha | Historial de decisiones y auditoría |
| `ai_runs` | id, project_id, etapa, modelo, tokens, costo estimado, duración, resultado, error | Control de costos y depuración |
| `settings` | clave, valor | Ponderaciones de puntaje, límites, textos legales |

### 3.4. Entidades del esquema `internal` (nunca accesibles desde rutas públicas)

| Tabla | Campos clave |
|---|---|
| `internal.notes` | project_id, autor, texto, tipo (nota/decisión/comentario), fecha |
| `internal.budget_hints` | project_id, presupuesto declarado, moneda, por persona/grupo, qué incluye, flexibilidad |
| `internal.quote_components` | project_id, versión, categoría (vuelo ida/regreso, interno, tren, bus, ferry, traslado, alojamiento, comidas, excursión, entrada, auto, seguro, otro), fechas, pax, especificaciones, proveedor posible, fuente, estado de verificación, elemento del plan vinculado |
| `internal.price_observations` | componente, tipo (`consulted_real` / `observed_on_date` / `reference_estimate` / `historical` / `unavailable`), proveedor, fecha y hora, fechas de viaje, pax, moneda, importe (decimal), incluye, no incluye, equipaje, cancelación, enlace, disponibilidad, válido hasta |
| `internal.quotes` | project_id, versión, moneda, tipo de cambio + fecha + fuente, impuestos y cargos, margen (editable, sin valor por defecto), honorarios, condiciones de pago, vigencia, estado |
| `internal.quote_lines` | quote_id, componente, observación usada, cantidad, subtotal |

Los cálculos (subtotal por categoría, total, por persona, por grupo, impuestos, margen, precio final) viven en `core/pricing` con decimal.js y se muestran **con su fórmula**.

### 3.5. Estructura del documento de plan (resumen)

```
PlanDocument
├─ profile        { declared, inferred[{field, value, rationale, confidence}], missing[] }
├─ weights        { criterio → peso efectivo, explicación del ajuste }
├─ alternatives[] (3) {
│    destinationRef, title, summary, idealTraveler, pros[], cons[],
│    scores{criterio → {value, rationale, factors+/-}}, compatibility,
│    labels[] (derivadas del análisis), seasonality(Claim), travelFromOrigin(Claim),
│    logisticsComplexity, lodgingChanges, tranquility, activities[], warnings[],
│    entryRequirements[](Claim + enlace oficial)
│  }
├─ seasonalComparison? { ventanas alternativas, hipótesis, rótulo "a investigar" }
├─ selectedAlternativeId
├─ route { stops[{place, nights, lodgingZone, arrival, departure, locked}], legs[{from,to,mode,duration(Claim),operators[],stations[],status}] }
├─ days[] { n, date?, stopId, plan, activities[{name, why, duration, where, booking, seasonal, effort, alternatives, officialUrl, locked}], meals[], freeTime, rainPlan?, effort, logisticsNotes }
├─ lodging[] { stopId, category, zone, options[{name, location, category, fit, pros, cons, services, url, source, toConfirm[]}] }
├─ flightsResearch { airportsOrigin[], airportsDest[], routingIdeas[], searchLinks[] }
├─ checks[]       { validador, severidad, mensaje, elementos afectados }
└─ pendingInfo[]
```

Nada en este documento contiene importes: los montos solo existen en `internal`. El presupuesto declarado influye en el puntaje a través de un **nivel** (p. ej., "ajustado", "moderado", "holgado" para esa región y duración).

---

## 4. Motor de IA y lógica determinista

### 4.1. Principio

La IA **interpreta, propone y redacta**. El código **calcula, valida y decide qué es un hecho**. Cada etapa produce JSON validado por esquema; si no valida, se reintenta una vez y luego se marca el error sin bloquear el resto.

### 4.2. Etapas

| # | Etapa | Quién | Salida |
|---|---|---|---|
| 1 | **Interpretación** del texto libre + respuestas | IA | Perfil: declarado / inferido (con justificación y confianza) / faltante. Nunca infiere datos sensibles (salud, religión, orientación, etc.). |
| 2 | **Planificador de preguntas** (paso 9) | Banco de preguntas por tipo de viaje (reglas) + IA que prioriza por impacto | 0 a 5 preguntas; nunca repite lo ya respondido. **Funciona sin IA** con las reglas. |
| 3 | **Candidatos** | Filtro determinista sobre la biblioteca (excluye conocidos/no deseados, aplica temporada) + IA puede sugerir destinos fuera de biblioteca rotulados "requiere investigación" | 6–10 candidatos |
| 4 | **Puntaje** | Determinista con insumos de IA donde haga falta juicio (afinidad) | Puntaje por criterio, peso, explicación de factores a favor y en contra |
| 5 | **Selección y etiquetas** | Determinista | 3 finalistas diversas; etiquetas tipo "mejor equilibrio", "más afín al presupuesto", "más tranquilidad" calculadas desde los criterios dominantes, no inventadas |
| 6 | **Distribución de noches** | Algoritmo (`core/nights`) | Paradas y noches que suman exactamente la duración |
| 7 | **Itinerario día por día** | IA con restricciones explícitas (noches, ritmo, exigencia, temporada) | Días y actividades estructurados |
| 8 | **Validadores** | Deterministas | Alertas: sumas, fechas, retrocesos geográficos, traslados > umbral, cambios de hotel vs. preferencia, sobrecarga diaria, cierres estacionales, conexiones no verificadas |
| 9 | **Revisión crítica** | IA | Inconsistencias cuestionario↔propuesta, afirmaciones sin fuente, datos pendientes |
| 10 | **Redacción para el cliente** | IA **sin acceso a importes** | Textos inspiracionales; pasan por el saneador |

### 4.3. Modelo de puntaje (configurable)

Criterios base (0–10): afinidad con intereses, adecuación a fechas, viabilidad climática, logística, adecuación al presupuesto, tiempo de traslado, ritmo, experiencias disponibles, compatibilidad con el grupo, riesgos (invertido).

- Pesos base en `settings`, editables por el administrador.
- Multiplicadores según prioridades: lo marcado como **indispensable** multiplica su criterio y, si no se cumple, aplica una penalización fuerte (o descarta).
  Ej.: "descansar" + "evitar cambiar de hotel" → sube *logística* y *ritmo*; "optimizar presupuesto" como prioridad 1 → sube *presupuesto*.
- Compatibilidad = promedio ponderado normalizado a 0–100, siempre acompañado de: "Esta es una recomendación orientativa del sistema, no una garantía".
- Cada puntaje guarda **por qué** (factores +/−), visible para el cliente en lenguaje simple y para el agente con detalle.

### 4.4. Distribución de noches (algoritmo)

1. Para cada parada: noches mínimas e ideales (biblioteca o IA, rotulado), ajustadas por intereses y ritmo (tranquilo ×1,3; intenso ×0,8).
2. Penalización por cambio de ciudad = horas de traslado estimadas → se descuenta tiempo útil del día de llegada.
3. Se reparten las noches totales por mayor "valor marginal" (método de restos/heurística voraz) respetando mínimos, día de llegada internacional (jet lag) y última noche cerca del aeropuerto de salida si el vuelo es temprano.
4. Si no alcanza para todas las paradas, **se propone quitar una** en lugar de comprimir (y se explica).
5. Verificación final: Σ noches = duración; fechas contiguas; sin días huérfanos.

### 4.5. Revisión parcial ante cambios

Un pedido ("cambiá Roma por Florencia") se clasifica por alcance → se generan **operaciones de parche** sobre el documento (agregar/quitar/modificar elementos por id) → solo se recalculan las partes afectadas → los elementos `locked` (editados por el agente) **no se tocan**; si un cambio los afecta, se presenta como propuesta para aprobar → se crea una **versión nueva** con resumen y *diff*.

### 4.6. Investigación asistida (solo en el panel)

Botón "Investigar" por tema (clima, requisitos, transporte entre A y B, hoteles en zona X). Usa la herramienta de búsqueda web de Claude con **lista de dominios preferidos** (sitios oficiales de turismo, gobiernos, operadores de transporte). Cada hallazgo se guarda como `source` con fecha de consulta y el dato queda en `verified_current` u `official_general` **solo si hay cita**. Tope de búsquedas por proyecto configurable.

### 4.7. Seguridad de la IA

- El texto del cliente se envía como **dato delimitado**, nunca como instrucción. El *prompt* de sistema declara que instrucciones dentro del texto del usuario se ignoran.
- La IA no tiene herramientas que accedan a la base ni a otros proyectos; recibe solo el contexto del proyecto en curso.
- Las salidas se validan por esquema y pasan por el saneador antes de llegar a cualquier vista pública.

### 4.8. Modelo y costos de IA

- Modelo por defecto: `claude-opus-5-5` (US$ 4 / US$ 20 por millón de tokens de entrada/salida, tabla de precios de Anthropic al 06/10/2026). Configurable por etapa (p. ej., `claude-haiku-5-5` a US$ 0,10 / 0,50 para clasificar pedidos de cambio, si las pruebas muestran que alcanza).
- Estimación **(no medida todavía)** por propuesta completa: ~60k tokens de entrada + ~30k de salida ≈ **US$ 0,85** en Opus 5.5; con cacheo de *prompts* baja la entrada. Un cambio pequeño: centavos. Se medirá con `ai_runs` en la Fase 4.
- La búsqueda web de la API tiene costo por búsqueda adicional a los tokens (verificar tarifa vigente antes de habilitarla).

---

## 5. Integraciones y proveedores

Estado consultado el 26/10/2026. "Gratis" nunca se asume: se indica la condición.

| Dominio | Proveedor candidato | Situación / condiciones | Decisión MVP |
|---|---|---|---|
| IA | Anthropic Claude API | Pago por uso; clave en servidor | **Integrado** |
| Vuelos | ~~Amadeus Self-Service~~ | Portal Self-Service **cerrado el 17/07/2026**; solo Enterprise | No usar |
| Vuelos | Duffel | Búsqueda y reserva vía API; cobra por orden confirmada y por exceso de búsquedas sobre la relación búsqueda/reserva (fuentes de terceros mencionan ~US$ 3 por orden; [apis.io](https://apis.io/plans/duffel/duffel-plans-pricing/)); requiere cuenta y condiciones comerciales | **Adaptador definido, desactivado**. MVP: enlaces de búsqueda prearmados (Google Flights/aerolíneas) + carga manual de tarifas observadas |
| Hoteles | LiteAPI | Alta gratuita con clave ([docs](https://docs.liteapi.travel/docs)); modelo comercial por reserva a confirmar | Fase 4, candidato principal |
| Hoteles | Expedia Rapid / Hotelbeds | Acceso por aprobación comercial caso por caso ([Expedia](https://innovation.expediagroup.com/en-us/join-us/rapid-api)) | Futuro, si el volumen lo justifica |
| Hoteles (MVP) | Carga manual + investigación con fuente | Sin inventar nombres: solo establecimientos con URL oficial o cargados por el agente | **MVP** |
| Clima | Biblioteca curada (normales climáticas con fuente) | Datos estacionales estables; se cargan una vez por destino | **MVP** |
| Clima | Open-Meteo | Uso comercial requiere suscripción; históricos/climatología solo en plan Professional ([pricing](https://open-meteo.com/en/pricing)) | Fase 4, para completar la biblioteca |
| Mapas | MapLibre + MapTiler/Stadia (clave) o PMTiles autoalojado | Planes con cuota; PMTiles en R2 evita costo por tesela | **MVP** con alternativa SVG si no hay teselas configuradas |
| Geocodificación | Coordenadas en biblioteca; MapTiler Geocoding como adaptador | Nominatim público prohíbe uso intensivo | MVP: biblioteca + carga manual |
| Rutas por carretera | OpenRouteService / OSRM | Cuotas en plan gratuito | Fase 4; antes, duraciones como `estimate` o `pending` |
| Trenes/buses/ferris | Sin API global confiable | Enlaces a operadores oficiales + tarea de validar | **Manual**, conexión marcada "pendiente de validación" |
| Atracciones | Biblioteca + Wikidata/Wikipedia (CC BY-SA) | Google Places restringe almacenamiento de contenido salvo `place_id` ([políticas](https://developers.google.cn/maps/documentation/places/web-service/policies?authuser=4)) | MVP: biblioteca + investigación con fuente |
| Imágenes | Unsplash API | Demo 50 req/h; producción con aprobación; **obligatorio usar las URLs servidas por Unsplash (hotlink) y atribuir** ([guías](https://help.unsplash.com/api-guidelines)) | **MVP** |
| Imágenes | Pexels API, Wikimedia Commons | Pexels con atribución recomendada; Commons con licencia por archivo | MVP (respaldo) |
| Imágenes propias | Fotos de la agencia / proveedores con permiso | En R2 con licencia registrada | MVP |
| Videos | YouTube Data API v3 + *embed* oficial (`youtube-nocookie`) | Cuota diaria (las búsquedas consumen mucha cuota) → cachear resultados por destino | **MVP** |
| Tipo de cambio | BCRA (API pública de cotizaciones) + carga manual | Se registra fuente y fecha; nunca se asume | MVP manual + adaptador BCRA en Fase 4 |
| Requisitos migratorios | Enlaces oficiales (Cancillería Argentina, consulados, autoridades de destino) | Timatic (IATA) / Sherpa son pagos | **MVP manual** con tarea "verificar"; adaptador futuro |
| Email | Resend / Postmark | Plan gratuito limitado | Adaptador; si falta clave → estado "no configurado" |

Cada adaptador implementa `health()` y el panel muestra **Integraciones: configurada / no configurada / con error**.

---

## 6. Costos operativos previsibles

Rangos orientativos para arrancar (a verificar con cada proveedor al contratar):

| Rubro | Rango mensual inicial | Variable principal |
|---|---|---|
| Hosting web + worker (Railway/Render) | US$ 10–40 | Memoria del worker (Chromium) |
| Postgres administrado | US$ 0–25 | Tamaño y copias de seguridad |
| Almacenamiento R2 | US$ 0–5 | GB de PDFs y fotos |
| IA (Claude) | ~US$ 1 por propuesta completa (estimado, a medir) | Cantidad de propuestas y regeneraciones |
| Búsqueda web de la IA (panel) | Según uso | Clics en "Investigar" |
| Unsplash / Pexels / YouTube | US$ 0 dentro de cuotas | Requieren aprobación/cuotas |
| Teselas de mapa | US$ 0–25 | Visitas a mapas (o PMTiles casi sin costo) |
| Email transaccional | US$ 0–20 | Envíos |
| Dominio + Cloudflare | ~US$ 1–2 | — |
| Sentry | US$ 0 (plan inicial) | Volumen de errores |

Controles de costo: tope diario global de generaciones, límite por IP/sesión anónima, Turnstile antes de generar, cacheo de *prompts* y de resultados de medios por destino, recálculo parcial, investigación solo manual, tablero de consumo en el panel.

---

## 7. Seguridad, privacidad y permisos

### 7.1. Autenticación y roles

- Personal de la agencia: email + contraseña robusta + **2FA TOTP obligatorio para propietario**; sesiones en base, cookies `HttpOnly`, `Secure`, `SameSite=Lax`; bloqueo progresivo ante intentos fallidos.
- Clientes: sin cuenta. Sesión anónima con **token aleatorio de 256 bits** en cookie `HttpOnly`; en base solo se guarda el *hash*.
- Usuario administrador inicial: creado por comando CLI (`pnpm admin:create`), nunca con credenciales por defecto.

### 7.2. Autorización

- Toda ruta `/api/admin/*` y toda *server action* verifica sesión **y** permiso sobre el recurso (proyecto asignado, rol). No se confía en ocultar botones.
- Rutas públicas: solo operan sobre la sesión anónima propia o sobre un token de enlace válido, no revocado y no vencido. Los IDs internos nunca aparecen en URLs públicas.
- Respuestas uniformes (404) para recursos ajenos o inexistentes, para no revelar existencia.

### 7.3. Separación de precios: defensa en profundidad

1. **Datos:** importes solo en el esquema `internal`.
2. **Base:** las páginas públicas usan un **rol de Postgres distinto** (`viora_public`) con `SELECT` únicamente sobre `share_links`, `client_snapshots`, `media_assets` y `intake_sessions`. Aunque hubiera un error de código, ese rol **no puede leer** `internal`.
3. **Instantáneas:** la vista del cliente nunca lee el plan crudo; lee una instantánea creada por un **serializador de lista blanca** (solo campos permitidos) y un **escáner** que rechaza la publicación si detecta patrones monetarios (`US$`, `USD`, `ARS`, `€`, `$` seguido de cifras, "precio", "tarifa", "costo"...), incluidos metadatos, `alt`, JSON embebido y archivos exportados.
4. **IA:** la etapa de redacción para el cliente no recibe importes como contexto.
5. **Pruebas:** casos automáticos que recorren la página pública, el HTML, el JSON de hidratación, el PDF y el texto de WhatsApp buscando cifras; fallan el *build* si encuentran algo.

### 7.4. Enlaces privados

Token aleatorio (≥ 128 bits efectivos) en la URL, *hash* en base, vencimiento configurable (por defecto 90 días), revocación inmediata desde el panel, registro de accesos, `noindex` y `Referrer-Policy: no-referrer`.

### 7.5. Otras medidas

- Validación de toda entrada con Zod en servidor; límites de longitud; escape de salida (React) y política CSP estricta.
- Protección CSRF (cookies `SameSite` + verificación de origen en *actions*), límites de tasa, cabeceras de seguridad.
- Secretos solo en variables de entorno del servidor/gestor de secretos; `.env.example` documentado sin valores reales; verificación en CI de que ninguna variable secreta se expone con prefijo público.
- Logs con redacción automática de email, teléfono, tokens y texto libre del cliente.
- Copias de seguridad diarias de Postgres (proveedor + volcado cifrado semanal a R2), prueba de restauración documentada.
- **Retención:** borradores anónimos sin contacto se eliminan a los 90 días; proyectos cerrados se anonimizan tras un plazo configurable; derecho de acceso, rectificación y supresión ejecutable desde el panel.
- **Normativa:** Argentina — Ley 25.326 de Protección de Datos Personales (aviso de privacidad, consentimiento, inscripción de la base ante la AAIP si corresponde) y datos de la agencia exigidos por la Ley 18.829 (legajo); si se atienden residentes de la UE, considerar RGPD. **Requiere validación con un asesor legal.**

---

## 8. Experiencia del cliente

### 8.1. Mapa de pantallas

```
/                         Portada
/planificar               Cuestionario (pasos 1–8, autoguardado)
/planificar/afinar        Preguntas inteligentes (paso 9, solo si aportan)
/planificar/generando     Estado de carga informativo (qué se está analizando)
/viaje/[sesión]           Concepto del viaje → 3 alternativas
/viaje/[sesión]/comparar  Comparador lado a lado (deslizable en celular)
/viaje/[sesión]/itinerario  Ruta, mapa, días, experiencias, medios
/viaje/[sesión]/compartir   Guardar / enlace / WhatsApp / pedir cotización
/p/[token]                Propuesta compartida (instantánea saneada)
/privacidad, /terminos
```

### 8.2. Flujo y momentos de fricción

- **Sin registro** hasta ver valor. Se pide contacto solo al **guardar para otro dispositivo, compartir o pedir cotización**, con un formulario mínimo (nombre + email o WhatsApp) y consentimiento explícito.
- Indicador de avance, botón "atrás" siempre disponible, preguntas condicionales (p. ej., edades solo si hay menores; equipaje de playa solo si aplica).
- Fechas: exactas, mes/temporada o "flexible ± N días"; si no hay fechas, la propuesta se rotula **"exploratoria (sin fechas confirmadas)"**.
- Presupuesto: primero se elige región/estilo tentativo; los rangos se adaptan a región, duración y cantidad de viajeros (tabla de niveles por región mantenida por la agencia, no números universales).
- Prioridades: selección múltiple → ordenar arrastrando → marcar "indispensable".
- Destinos conocidos: buscador con autocompletado de la biblioteca + texto libre; "me encantó / no volvería / pendiente / no quiero ir".

### 8.3. Presentación de resultados

Jerarquía para no abrumar: **concepto del viaje** (título + frase + imagen) → **tres alternativas** (tarjeta con imagen grande, motivo principal, compatibilidad y etiqueta) → **comparador** → elegir → **itinerario** (vista de ruta, luego día por día plegable) → **medios** → **próximos pasos y CTA**.

Estados: carga con mensajes reales de etapa, error recuperable ("no pudimos generar el itinerario; tus respuestas están guardadas, reintentá"), imagen con reemplazo, video ausente sin romper el diseño.

### 8.4. Sistema visual (dirección inicial)

- Personalidad: cálida, luminosa, editorial, cercana. Nada de gradientes violetas "de IA", ni emojis como íconos.
- Tipografía: serif editorial para títulos (p. ej., *Fraunces*) + sans humanista para interfaz (p. ej., *Inter* o *Manrope*), escala modular.
- Color: arena/hueso como fondo, un azul profundo de mar como primario, un terracota como acento, verdes suaves para estados; modo oscuro opcional en el panel.
- Fotografía protagonista a sangre, mucho aire, tarjetas con jerarquía (no grillas repetitivas iguales), iconografía de línea consistente (Lucide).
- Movimiento: transiciones cortas (150–250 ms), respeto de `prefers-reduced-motion`.
- *Mobile first*; objetivo Lighthouse ≥ 90 en rendimiento y accesibilidad en la portada y la propuesta compartida.

---

## 9. Panel privado de la agencia

### 9.1. Pantallas

```
/admin                     Dashboard (KPIs, actividad reciente, tareas que vencen)
/admin/proyectos           Lista: buscar, filtrar (estado, fecha, destino, agente, prioridad), ordenar, archivar
/admin/proyectos/[id]      Ficha con pestañas:
   Resumen · Perfil (declarado vs. inferido) · Alternativas y puntajes (pesos editables)
   · Itinerario (editor: reordenar, noches, actividades, bloqueo) · Logística y vuelos
   · Alojamiento · Experiencias · Requisitos · Fuentes y verificación
   · Componentes a cotizar · Presupuesto · Tareas · Notas · Versiones (diff, restaurar)
   · Compartir (enlaces, vencimiento, revocar) · Informes (exportar) · Actividad
/admin/clientes, /admin/clientes/[id]   Ficha y viajes asociados
/admin/biblioteca          Destinos, temporadas, fuentes, medios
/admin/ajustes             Usuarios y roles, estados, ponderaciones, integraciones, límites, retención, textos legales
```

### 9.2. Edición y control humano

- Cualquier elemento editable; al editar queda `origin: agent` y `locked: true`.
- La IA nunca sobrescribe elementos bloqueados; si una regeneración los afecta, muestra el impacto y pide aprobación.
- Botones: "Aprobar versión", "Crear versión", "Publicar para el cliente", "Marcar como verificado", "Agregar cotización real".
- Cada guardado genera entrada en `activity_log`; las versiones se comparan lado a lado.

---

## 10. Informes y exportaciones

| Documento | Formatos | Contenido | Precios |
|---|---|---|---|
| Propuesta del cliente | Web `/p/[token]`, PDF, vista celular, texto WhatsApp (`wa.me` con mensaje prearmado) | Los 15 puntos de §9.1 del pedido | **Nunca** |
| Informe interno | PDF, vista estructurada (HTML/JSON), XLSX de presupuesto, CSV de componentes, resumen ejecutivo, enlaces de investigación | Secciones A–F de §9.2 del pedido, con fuentes, fechas y estado de verificación | Sí (solo panel) |
| Propuesta comercial presupuestada | Web con enlace propio + PDF | Servicios incluidos/excluidos, moneda, vigencia, condiciones; generada solo desde cotización aprobada | Sí, en documento independiente |

---

## 11. Estrategia de pruebas

| # | Escenario (§20) | Tipo de prueba |
|---|---|---|
| 1–9 | Playa 14 noches, Eurotrip 21 días (primera vez / ya conoce), bajo presupuesto, familiar, romántico, indeciso, fechas flexibles, fuera de temporada | Unidad (puntaje, noches, validadores) con perfiles de prueba + evaluación de IA con respuestas grabadas (rotuladas DEMO) + suite opcional en vivo |
| 10 | Proyecto sin datos suficientes | Unidad + E2E: el sistema pregunta o marca pendiente, no inventa |
| 11–12 | Búsqueda externa que falla / API sin credenciales | Integración con adaptadores que fallan; la UI muestra "no configurado" y ofrece flujo manual |
| 13 | Imagen que no carga | E2E con red bloqueada → imagen de reemplazo |
| 14 | Cambio de itinerario | Unidad del parche + E2E: elementos bloqueados intactos, nueva versión con diff |
| 15 | Cotizaciones manuales | Unidad de `core/pricing` con decimales, margen, tipo de cambio |
| 16 | Exportación de ambos informes | Integración: genera PDF/XLSX y verifica contenido |
| 17 | Acceso a proyecto ajeno | E2E/integración: modificar IDs y tokens → 404 |
| 18 | Propuesta pública intentando obtener precios | Escáner sobre HTML, JSON, PDF y WhatsApp; prueba del rol `viora_public` sin acceso a `internal` |

Invariantes verificadas en todas las pruebas: Σ noches = duración, fechas consistentes, coherencia geográfica, estimaciones rotuladas, ausencia de importes en vistas de cliente.
Regla: el documento de estado del proyecto lista **qué se probó, con qué resultado y qué falta**. No se reportan pruebas no ejecutadas.

---

## 12. Plan de implementación por fases

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **1. Análisis** (este documento) | Requisitos, arquitectura, datos, integraciones, seguridad, UX | Aprobación del plan y respuestas a las preguntas abiertas |
| **2. Diseño de producto** | Sistema visual (tokens, tipografía, componentes), prototipos navegables de cuestionario, comparador, itinerario, propuesta y panel; estados de carga/error | Prototipo revisado en celular y escritorio |
| **3a. Fundaciones** | Monorepo, Docker, Postgres + migraciones, roles de base, auth + 2FA, CI (lint, tipos, pruebas), `.env.example`, comando de administrador | `pnpm dev` levanta todo; pruebas de permisos en verde |
| **3b. Núcleo** | `core`: esquemas, puntaje, noches, fechas, validadores, saneador, pricing | Pruebas unitarias de los 18 escenarios a nivel núcleo |
| **3c. Flujo del cliente** | Portada, cuestionario con autoguardado, preguntas inteligentes, generación, alternativas, comparador, itinerario, mapa, medios, guardar/compartir, pedir cotización | Ciclo completo desde celular sin registro |
| **3d. Panel** | Dashboard, proyectos, cliente, editor con bloqueo, versiones y diff, tareas, notas, componentes, cotizaciones, presupuesto, enlaces | Agente puede editar, aprobar y publicar |
| **3e. Informes** | PDF/web/WhatsApp del cliente; PDF/XLSX/CSV internos; propuesta presupuestada | Escáner de precios en verde |
| **4. Integraciones y calidad** | Adaptadores (LiteAPI, Duffel, Open-Meteo, BCRA, rutas), investigación asistida, optimización, auditoría de seguridad, accesibilidad | Pruebas E2E completas y revisión de seguridad |
| **5. Producción** | Despliegue, backups probados, monitoreo, documentación operativa y de diagnóstico | Restauración de backup probada; guía de instalación validada desde cero |

Biblioteca de destinos inicial (en paralelo, Fase 3b): ~40 destinos relevantes para clientes argentinos (Caribe, Brasil, Europa clásica y alternativa, EE. UU./parques, Asia, Patagonia/Norte argentino), con datos estacionales y fuentes. **Los datos cargados por IA quedan como `ai_recommendation` hasta que la agencia los revise.**

---

## 13. Estructura del repositorio prevista

```
viora-travel/
├─ apps/
│  ├─ web/            Next.js (rutas (public) y (admin), API)
│  └─ worker/         pg-boss: IA, PDF, XLSX, medios, retención
├─ packages/
│  ├─ core/           dominio puro + pruebas
│  ├─ ai/             etapas, prompts, esquemas de salida
│  ├─ integrations/   puertos + adaptadores + estados de configuración
│  ├─ db/             esquema Drizzle, migraciones, repositorios (public/internal separados)
│  ├─ reports/        plantillas de impresión, XLSX, WhatsApp
│  └─ ui/             sistema de diseño
├─ data/seed/         biblioteca de destinos + datos DEMO (rotulados)
├─ docs/              arquitectura, API, variables de entorno, operación, estado
├─ docker-compose.yml
└─ .env.example
```

---

## 14. Preguntas abiertas para VIORA TRAVEL

Ver el mensaje de entrega de esta fase (agrupadas). Hasta recibir respuesta se usan las decisiones por defecto de §1.3.
