# Estado del proyecto

Fecha: 26/10/2026. Este documento separa lo que **funciona y fue probado**, lo que **funciona con alternativa manual** y lo que **está pendiente**. Ninguna función pendiente se presenta como terminada.

## 1. Entregables (sección 23 del pedido)

| # | Entregable | Estado |
|---|---|---|
| 1 | Aplicación web funcional | ✅ Ciclo completo cliente → panel → cotización, probado de punta a punta |
| 2 | Código fuente organizado | ✅ `src/core` (dominio), `src/server`, `src/app` |
| 3 | Arquitectura documentada | ✅ [`ARQUITECTURA.md`](ARQUITECTURA.md) |
| 4 | Modelo de datos | ✅ `src/server/db/schema.ts` + migración `drizzle/0000_init.sql` |
| 5 | Autenticación y permisos | ✅ Roles propietario, agente y solo lectura; 2FA TOTP; bloqueo por intentos; rol de base público aislado |
| 6 | Cuestionario inteligente | ✅ 9 pasos, condicionales, autoguardado, preguntas de alto impacto (13 en el banco) |
| 7 | Motor de recomendación | ✅ Determinista, 10 criterios, ponderaciones según prioridades, etiquetas derivadas del análisis |
| 8 | Comparador | ✅ Columnas en escritorio, carrusel en celular, puntaje por criterio y comparación estacional |
| 9 | Constructor de itinerarios | ✅ Noches, días, traslados, alojamiento, validaciones y edición |
| 10 | Imágenes y videos | ✅ Con atribución, caché y reemplazo visual; ⚠️ requieren claves o red (Wikimedia funciona sin clave) |
| 11 | Mapa | ✅ MapLibre + mapa esquemático de respaldo |
| 12 | Panel administrativo | ✅ |
| 13 | Base de datos persistente | ✅ PostgreSQL |
| 14 | Informe del cliente sin precios | ✅ Web, PDF, celular y WhatsApp |
| 15 | Informe interno | ✅ Web, PDF, XLSX, CSV y JSON |
| 16 | Tareas de cotización | ✅ Sugeridas por el sistema y editables, con 4 estados |
| 17 | Edición manual | ✅ Con bloqueo, versionado y restauración |
| 18 | Exportación | ✅ |
| 19 | Pruebas documentadas | ✅ Ver sección 3 |
| 20 | Instalación y despliegue | ✅ [`README.md`](../README.md); ⚠️ la imagen Docker no se pudo construir en el entorno de desarrollo (ver sección 3) |
| 21 | APIs y variables de entorno | ✅ `.env.example` y README |
| 22 | Completo / pendiente | ✅ Este documento |
| 23 | Costos operativos | ✅ Sección 5 |
| 24 | Riesgos y mejoras futuras | ✅ Sección 6 |

## 2. Funciona con alternativa manual (no se finge la integración)

| Función | Situación actual | Próximo paso |
|---|---|---|
| Búsqueda de vuelos | Enlaces de búsqueda prearmados (Google Flights) y carga manual de tarifas observadas, con fecha, fuente y vigencia | Adaptador Duffel (requiere cuenta comercial; cobra por reserva) |
| Hoteles | Categoría y zona sugeridas por el motor; el agente agrega hoteles reales con fuente. **El sistema no inventa nombres de hoteles** | Adaptador LiteAPI, Hotelbeds o Expedia Rapid |
| Horarios de trenes y buses | Duración de referencia (estimación) y operadores oficiales; el agente marca cada traslado como verificado con su fuente | Integraciones por operador si se justifica |
| Requisitos migratorios | Enlaces oficiales por país y estado «pendiente de confirmar». No se emiten garantías | Proveedor pago (Timatic o Sherpa) si el volumen lo justifica |
| Clima | Valores habituales aproximados de la biblioteca, rotulados como **estimación** | Validar con servicios meteorológicos oficiales u Open-Meteo (plan comercial) |
| Tipo de cambio | Carga manual, con fecha y fuente, en cada presupuesto | Adaptador para la API de cotizaciones del BCRA |
| Notificación de solicitudes | Email por SMTP si está configurado; si no, queda registrada en el panel y **no se informa como enviada** | Configurar Gmail SMTP (gratis) |
| Recordatorios | Fecha de seguimiento y tablero «próximos 7 días» | Avisos automáticos por email o WhatsApp |

## 3. Pruebas ejecutadas

Entorno: Node 22, PostgreSQL 16 local, Chromium 1243. Resultados reales de esta sesión.

**Unitarias y de escenarios** (`pnpm test`, Vitest): **39 pruebas pasan, 0 fallan**.

| Escenario del pedido | Prueba | Resultado |
|---|---|---|
| 1. Playa 14 noches | Destino único de playa, 3 alternativas distintas con etiquetas distintas, clima rotulado como estimación | ✅ |
| 2. Eurotrip 21 días, primera vez | Rutas europeas multidestino, noches no uniformes, fechas consecutivas, detecta primera vez | ✅ |
| 3. Eurotrip para quien ya conoce Madrid, París y Roma | La alternativa principal no incluye esas ciudades | ✅ |
| 4. Presupuesto muy limitado | Nivel de costos menor que el promedio europeo | ✅ |
| 5. Familiar | Incluye Orlando y advierte el calor | ✅ |
| 6. Romántico | Destinos románticos; pregunta por el escenario | ✅ |
| 7. No sabe adónde ir | Propuesta exploratoria y pregunta por regiones | ✅ |
| 8. Fechas flexibles | Ventanas estacionales rotuladas como hipótesis | ✅ |
| 9. Fuera de temporada | Advierte cierres y no incluye actividades fuera de temporada | ✅ |
| 10. Sin datos suficientes | Lista lo que falta en lugar de inventar | ✅ |
| 14. Cambio de itinerario | «Menos ciudades», «cambiar X por Y», respeto de elementos bloqueados | ✅ |
| 15. Cotizaciones manuales | Cálculo exacto con decimales; exige tipo de cambio | ✅ |
| 18. Precios en la vista pública | Lista blanca y escáner de importes | ✅ |
| 17. Acceso a datos ajenos (base) | El rol público no puede leer `internal`, proyectos, clientes ni respuestas | ✅ (`tests/integration/db-roles.test.ts`) |

En todos los escenarios se verifica además: noches = duración, días = noches + 1, sin errores de validación y saltos geográficos razonables.

**Punta a punta** (`pnpm test:e2e`, Playwright, contra el **build de producción**): **12 pruebas pasan, 0 fallan**.

- Flujo del cliente completo, sin importes en el texto visible ni en el HTML del enlace compartido (el monto declarado de prueba nunca aparece).
- Solicitud de cotización sin SMTP: no afirma que se envió un email.
- Celular (Pixel 7): sin desplazamiento horizontal.
- 11. Búsqueda externa que falla y 13. imagen que no carga: la página funciona con reemplazos.
- Mapa con teselas bloqueadas: se muestra el esquema SVG.
- 17. Seguridad: panel y exportaciones exigen sesión; tokens inventados → 404; vistas imprimibles sin firma → 404; sin sesión de viaje no hay acceso a `/viaje`.
- Instrucción maliciosa en el cuestionario: no se muestran márgenes ni precios.
- 16. Panel: edición con bloqueo, presupuesto (1.000 × 1,10 = 1.100,00), publicación y exportaciones JSON, CSV y XLSX.

**Verificado manualmente en esta sesión**: PDF del cliente y PDF interno con Chromium (HTTP 200, `application/pdf`); propuesta comercial con precios en su propio enlace; bloqueo tras contraseña incorrecta; límite anti-abuso por IP (se activó durante las pruebas, como corresponde).

**No ejecutado o no verificado:**

- **12. API sin credenciales de IA**: el camino sin clave es el que corrió en todas las pruebas. **El camino con clave de Claude no se probó contra la API real** porque no hay clave en este entorno.
- Imágenes y videos reales: el entorno bloquea Unsplash, Wikimedia y YouTube, así que solo se probó el reemplazo visual.
- Construcción de la imagen Docker: falló por límite de descargas del registro de Docker («Too Many Requests»), no por el `Dockerfile`. Hay que construirla en el servidor.
- Envío real de email por SMTP.
- Verificación de enlaces oficiales de la biblioteca: la función existe (Biblioteca → «Verificar enlaces»), pero el entorno no tiene salida a esos sitios.

## 4. Datos de la biblioteca

60 destinos y 231 actividades cargados como **semilla de referencia**: coordenadas, aeropuertos, clima habitual aproximado, temporadas, riesgos, zonas de alojamiento y enlaces oficiales. **Hay que revisarlos**: el clima y los niveles de costo son estimaciones, y los enlaces deben verificarse con el botón del panel una vez desplegado. Los destinos editados por la agencia no se sobrescriben al actualizar la semilla.

## 5. Costos operativos previsibles

| Rubro | Opción elegida | Costo mensual orientativo |
|---|---|---|
| Servidor | VPS de 2 GB con Docker (Caddy, app y Postgres en el mismo servidor) | US$ 5–12 (o capa gratuita de Oracle Cloud, a verificar) |
| Dominio | — | ~US$ 1 |
| Base de datos y copias | En el mismo VPS + copia externa (por ejemplo, almacenamiento gratuito) | US$ 0–2 |
| IA | Opcional | ~US$ 1 por propuesta con textos mejorados (estimación no medida; cada llamada queda registrada en `ai_runs`) |
| Email, imágenes, videos y mapa | SMTP Gmail, Unsplash, Pexels, Wikimedia, YouTube, OpenFreeMap | US$ 0 dentro de cuotas gratuitas |

Controles de gasto: límite diario de IA, límite de generaciones por IP, caché de medios de 30 días e investigación con IA solo a pedido del agente.

## 6. Riesgos y mejoras futuras

**Riesgos**

- Datos de la biblioteca sin revisar (clima, costos y enlaces): revisarlos antes de lanzar.
- Textos legales (privacidad y términos) son una base: los tiene que revisar un abogado. Hay que evaluar la inscripción de la base ante la AAIP y mostrar el legajo de la agencia (`AGENCY_LEGAL_ID`).
- Un solo servidor: si se cae, se cae todo. Las copias diarias y la prueba de restauración son indispensables.
- Proveedores de mapas e imágenes gratuitos pueden cambiar sus condiciones: están detrás de adaptadores reemplazables.
- Los mensajes de error de las acciones del panel en producción son genéricos; falta validación en línea más detallada.

**Mejoras futuras sugeridas** (la arquitectura las admite sin rehacerla)

1. Adaptadores de vuelos (Duffel) y hoteles (LiteAPI) con registro automático de consultas en `price_observations`.
2. Cola de trabajos (pg-boss) cuando haya volumen.
3. Ampliar la biblioteca: cruceros, road trips con tramos en auto, más destinos de Asia y Medio Oriente, plantillas de viaje editables.
4. Cuentas de cliente con enlace mágico y reutilización de preferencias con consentimiento.
5. Recordatorios automáticos y alertas de cambios cuando haya fuentes compatibles.
6. Editor visual de la biblioteca (hoy se edita en JSON validado).
7. Medición real de costos de IA y comparación de calidad entre modelos.
