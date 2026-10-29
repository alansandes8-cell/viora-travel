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

### Ajustes de experiencia (pedido de la agencia)

- Botón «Siguiente» fijo abajo en todo el cuestionario (celular y escritorio).
- Emojis en estilos de viaje, prioridades, presupuesto, acompañantes, alojamiento y transporte.
- Juego «¿Esto o aquello?» (6 elecciones rápidas, opcional) que alimenta intereses y ritmo reales del perfil.
- Progreso como pasaporte con sellos, tarjeta «Tu perfil viajero» y confeti al ver la propuesta (se desactiva con «reducir movimiento»).
- Fotos: en la plataforma salen de Unsplash/Pexels/Wikimedia si hay claves; si no hay foto, se muestra una postal ilustrada del destino rotulada «Ilustración». La vista previa usa solo ilustraciones.

### Cuarta ronda: coherencia con lo que pide la persona

- **Intenciones fuertes**: lo que la persona repite en dos o más respuestas (estilo, prioridades, juego, texto) manda: las alternativas se limitan a destinos fuertes en eso (con respaldo si no alcanzan). Ej.: compras → Miami y Orlando, Nueva York; con días de compras en lugares reales (outlets, Ross, Marshalls, TJ Maxx, Sawgrass Mills, Dolphin Mall, Woodbury Common).
- **Negativos que siempre ganan**: «no me interesa París» nunca vuelve a aparecer, aunque la IA lo sugiera. Se agregaron 5 destinos de Francia (Costa Azul, Provenza, Valle del Loira, Normandía y Mont Saint-Michel, Alsacia).
- **Costo aproximado del viaje** (por persona y para el grupo): vuelos desde Argentina + alojamiento + traslados, según nivel de viaje y temporada alta. Valores promedio de referencia editables en Ajustes; se aclara que no es una cotización. Gastos diarios recalibrados (~70 € por día en Europa de costo medio).
- **Fotos**: las playas muestran primero la playa; varios lugares de respaldo por destino y por categoría; se aceptan fotos verticales; las alternativas usan la primera foto real disponible.
- **Cuestionario de 7 pasos** (antes 10): «¿Cuándo y desde dónde?», «¿Qué te gusta y qué no?» (prioridades + lugares conocidos / que no interesan) y alojamiento dentro de «Últimas preguntas». Se quitaron el orden de prioridades, «indispensables», qué incluye el presupuesto, flexibilidad del presupuesto, preferencias de vuelo y transporte.
- Pruebas: 62 unitarias y 16 e2e pasan.

### Tercera ronda de ajustes de la agencia

- **Fotos**: la causa probable de las fotos faltantes era el límite de Wikipedia para consultas sin identificación de contacto y en ráfaga, con el error recordado 14 h. Ahora: identificación con el sitio, como máximo 2 consultas a la vez, precarga agrupada al iniciar el servidor (≈ 8 consultas para ~185 lugares) y reintento de errores a los 10 min. Panel → Ajustes → «Fotos de destinos» muestra cuántas hay y permite volver a buscarlas. **No verificado en vivo** (el entorno de desarrollo no accede a Wikipedia).
- **Texto libre**: entiende países («21 días en Italia»), recorridos de varias ciudades, meses, con quién viaja y experiencias (trekking, buceo, vinos, esquí…), y ofrece «Ver mis propuestas ahora». Con `GEMINI_API_KEY` (gratis) lo interpreta la IA; sin clave, reglas. Se agregaron Cinque Terre, Milán y Lago de Como, y Sicilia.
- **Cuestionario**: pasos clicables, regreso sugerido al elegir la salida, presupuesto en monto primero, buscador mundial de aeropuertos (OurAirports, dominio público) y de ciudades/países.
- **Itinerario**: gastos diarios orientativos por persona (comidas, transporte local y entradas; tabla editable en Ajustes) — única excepción a «sin importes», pedida por la agencia; fotos de las zonas para alojarse y enlace a Google Maps (sin recomendar hoteles); enlaces a YouTube por ciudad.
- **PDF**: funciona en las pruebas locales (e2e descarga un PDF real). Para el servidor se ajustaron opciones de Chromium y la redirección de respaldo; Ajustes → «Prueba de PDF» muestra el error exacto si algo falla.
- **Viorita-bot**: asistente abajo a la derecha; toma nombre, email y WhatsApp con consentimiento, responde con IA gratuita (Gemini o Groq) o deriva a un asesor sin IA; los contactos y la conversación aparecen en el panel.
- Pruebas: 58 unitarias y 16 e2e pasan (el e2e del panel requiere credenciales locales).

### Segunda ronda de ajustes de la agencia

- Logo nuevo (horizontal, fondo transparente) e íconos de la app con fondo azul.
- «Empezar de cero» en el cuestionario y «Mis viajes» (`/viajes`): cada viaje queda guardado en el dispositivo y se puede retomar o quitar. Probado de punta a punta (e2e).
- Fotos de destinos: se buscan por lugares emblemáticos (3 por destino) y salen de la imagen principal del artículo de Wikipedia (licencia libre, horizontales); Unsplash/Pexels como alternativa. **No se pudo verificar en vivo desde el entorno de desarrollo** (sin acceso a Wikipedia): probado con respuestas simuladas. Si no hay foto apta se muestra la postal ilustrada.
- Itinerarios: máximo 2 días de parque seguidos (1 con chicos menores de 6 o ritmo tranquilo) con «Descanso entre parques»; los parques de día completo ahora sí se programan; llegada y primer día suaves en destinos de altura.
- Temporada: no se recomiendan playas en el pico de sargazo (mayo–agosto) ni el Caribe de playa con huracanes frecuentes (agosto–octubre), monzón para playa o calor extremo con chicos chicos; si el cliente lo pide igual, se respeta y se advierte.
- Flexibilidad de fechas explicada con ejemplo; al enviar, si hay un error, se marca el paso en rojo y se lleva a la persona a ese paso.

### App para celular (PWA)

- Instalable en Android y iPhone desde `/app` (manifiesto, íconos, service worker). Verificado en Chromium: sin errores de instalabilidad, service worker activo, página «Sin conexión» cuando no hay internet.
- El service worker no guarda propuestas ni datos privados: solo la página sin conexión y el ícono.
- El panel se instala como app aparte («VIORA Panel»). En el panel, «App para clientes» tiene link, QR y envío por WhatsApp.
- No se probó en un iPhone ni en un Android físicos (hace falta el servidor publicado con HTTPS).

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

**Unitarias y de escenarios** (`pnpm test`, Vitest): **62 pruebas pasan, 0 fallan** (3 de integración con la base se omiten si no hay base configurada).

| Escenario del pedido | Prueba | Resultado |
|---|---|---|
| 1. Playa 14 noches | Destino único de playa, 3 alternativas distintas con etiquetas distintas, clima rotulado como estimación | ✅ |
| 2. Eurotrip 21 días, primera vez | Rutas europeas multidestino, noches no uniformes, fechas consecutivas, detecta primera vez | ✅ |
| 3. Eurotrip para quien ya conoce Madrid, París y Roma | **Ninguna** alternativa incluye esas ciudades (ni en el texto libre «ya conozco…», ni por país visitado); si faltan opciones nuevas, primero alarga estadías y solo como último recurso repite, con aviso a la agencia | ✅ |
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
