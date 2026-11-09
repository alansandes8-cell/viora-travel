# «Mi viaje»: el área de clientes que compraron

## Cómo cargar un viaje vendido (paso a paso)

1. **Panel → Clientes →** abrí el cliente (si no existe, se crea solo cuando pide cotización o chatea con Viorita).
2. En **«Viajes vendidos»** completá *Nuevo viaje vendido*: subtítulo (p. ej. «Europa 2027»), fechas de salida y regreso, viajeros y la foto de portada (un lugar, como «Lago di Braies», o un enlace https a tu propia foto). Tocá **Crear viaje**.
3. **Servicios comprados**: agregá vuelos, hoteles, trenes, traslados, actividades y la asistencia. En los hoteles cargá check-in/out, desayuno, puntaje, precio, dirección y hasta 3 fotos (enlaces https).
4. **Vouchers**: subí los PDF o fotos (hasta 10 MB) y elegí a qué servicio corresponden. El cliente los abre con un toque.
5. **Plan día por día**: ya aparece un día por fecha, con la ciudad según el hotel de esa noche y los vuelos/trenes/actividades en su día. Tocá un día para cargar el horario como en tu PDF (hora, actividad, detalle, foto del lugar, enlace y voucher relacionado). **Guardá el plan.**
6. En **Datos del viaje** pasá el estado a **Publicado** y marcá **Incluye Europa Go** si corresponde.
7. **Acceso del cliente**: tocá *Dar acceso y generar enlace* y mandáselo por WhatsApp (hay un botón que arma el mensaje). El cliente entra al enlace, **elige su propia contraseña** y ya ve su viaje. El enlace vale 14 días y sirve una vez.
8. Usá **«Ver como el cliente»** para revisar cómo queda antes de mandarlo.

Después el cliente entra siempre desde **viora-travel.com/acceder** (o el ícono de persona arriba a la derecha) con su email y su contraseña.

## Si el cliente olvida la contraseña
- Con el email configurado (SMTP), puede pedir un enlace en «Olvidé mi contraseña».
- Si no, desde el panel tocá *Enviar enlace para cambiar contraseña* y mandáselo por WhatsApp.

## Seguridad
- Nunca se generan ni se mandan contraseñas: cada cliente elige la suya (guardada cifrada).
- Cada cliente solo ve sus viajes **publicados** y sus vouchers; nadie más puede abrirlos (ni con el enlace del archivo).
- Bloqueo temporal tras varios intentos fallidos y límite de intentos por conexión.
- Al «anonimizar» un cliente se borran su acceso, sus viajes vendidos y sus vouchers.

## Viaje de ejemplo (para verlo o mostrarlo)

En el servidor:
```
cd viora-travel
docker compose run --rm setup pnpm demo:mi-viaje --email TU-EMAIL
```
Crea el cliente «DEMO · Cliente de prueba» con un viaje publicado a Europa (Roma, Florencia, Venecia y París: vuelos, hoteles, trenes, actividades, asistencia y plan día por día) y muestra el enlace para elegir la contraseña. Se puede repetir: cada vez lo vuelve a crear desde cero. Para borrarlo, anonimizá o eliminá ese cliente desde el panel.
