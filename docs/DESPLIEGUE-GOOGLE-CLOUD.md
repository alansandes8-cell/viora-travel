# Poner VIORA TRAVEL en línea gratis (Google Cloud + DuckDNS)

Alternativa a Oracle Cloud para cuando Oracle rechaza el alta. Pensada para hacerla sin experiencia técnica. Tiempo estimado: entre 1 y 2 horas (la primera compilación es lenta).

**Qué vas a tener al final:** la web en `https://tu-nombre.duckdns.org`, con HTTPS, base de datos, copias diarias y el panel en `/admin`, instalable como app en el celular.

**Costo:** Google ofrece gratis para siempre un servidor chico (**e2-micro**, 1 GB de memoria) con hasta 30 GB de disco **estándar** y 1 GB de tráfico de salida por mes, solo en las regiones **us-east1, us-central1 y us-west1**. Además, las cuentas nuevas reciben US$ 300 de crédito por 90 días.

> **A tener en cuenta (honesto):**
> - Google cobra la IP pública de los servidores (unos US$ 0,005 por hora, ≈ US$ 3,6 por mes) y su documentación no deja claro si el servidor gratuito queda exento. Durante los primeros 90 días lo cubre el crédito. La **alerta de gasto del paso 1** te avisa si aparece algún cargo; si pasa, lo vemos (la alternativa paga más simple ronda los US$ 4–6 por mes).
> - El servidor es chico: la plataforma funciona bien, pero **compilarla tarda entre 20 y 40 minutos** (la primera vez y en cada actualización), y los PDF tardan unos segundos más.
> - Las pantallas de Google cambian seguido. Si un botón tiene otro nombre, buscá el más parecido o mandame una captura.

---

## Paso 1 — Crear la cuenta de Google Cloud

1. Entrá a **https://cloud.google.com/free** y tocá **Comenzar gratis** (o *Get started for free*), con tu cuenta de Google.
2. País: **Argentina**. Tipo de cuenta: **Individual**. Cargá la tarjeta (es para verificar identidad).
3. Cuando entres a la consola (**https://console.cloud.google.com**), arriba a la izquierda tocá el selector de proyectos → **Proyecto nuevo** → nombre `viora` → **Crear**. Asegurate de que quede seleccionado.
4. **Activá la cuenta completa** para que el servidor no se apague cuando terminen los 90 días de prueba: menú ☰ → **Facturación** → botón **Activar** / **Actualizar cuenta** (*Activate full account*). Conservás el crédito que te quede y lo gratuito sigue siendo gratuito.
5. **Alerta de gasto (importante):** ☰ → **Facturación** → **Presupuestos y alertas** → **Crear presupuesto** → monto **US$ 1** → alertas al **50 %** y **100 %** → que te avise por email. Así, si algún día aparece un cargo, te enterás enseguida.

---

## Paso 2 — Crear tu subdominio gratuito (DuckDNS)

1. Entrá a **https://www.duckdns.org** e iniciá sesión con tu cuenta de Google.
2. En **sub domain** escribí un nombre, por ejemplo `vioratravel`, y tocá **add domain**. Tu dirección va a ser `vioratravel.duckdns.org`.
3. Copiá y guardá el **token** que aparece arriba (una cadena larga). Lo vas a usar en el paso 5.

---

## Paso 3 — Crear el servidor

1. ☰ → **Compute Engine** → **Instancias de VM**. La primera vez te pide **Habilitar** la API: tocá y esperá un minuto.
2. **Crear instancia**. Completá **exactamente** así (lo que no se menciona, dejalo como viene):
   - **Nombre:** `viora`
   - **Región:** **us-east1 (Carolina del Sur)** — es la más cercana a Argentina de las gratuitas. Zona: cualquiera.
   - **Configuración de la máquina:** serie **E2** → tipo **e2-micro**. (El costo estimado que muestra arriba no descuenta lo gratuito; es normal que figure un monto.)
   - **SO y almacenamiento** → **Cambiar**:
     - Sistema operativo: **Ubuntu**. Versión: **Ubuntu 24.04 LTS** (la que dice **x86/64**, no «Minimal» ni «Arm64»).
     - Tipo de disco de arranque: **Disco persistente estándar** (*Standard persistent disk*). ⚠️ No dejes «Balanceado»: ese **no** es gratuito.
     - Tamaño: **30 GB**. → **Seleccionar**.
   - **Protección de datos / Copias de seguridad:** elegí **Sin copias de seguridad** (las copias las hacemos nosotros a tu Google Drive en el paso 7; las de Google se cobran).
   - **Herramientas de redes** → **Firewall:** marcá **Permitir tráfico HTTP** y **Permitir tráfico HTTPS**.
   - **Observabilidad:** si aparece «Instalar el agente de operaciones», desmarcalo (usa memoria).
3. Tocá **Crear**. En un minuto aparece con un tilde verde. Anotá la **IP externa** (por ejemplo, `34.75.10.20`).

---

## Paso 4 — Apuntar el subdominio al servidor

1. Volvé a **duckdns.org**.
2. En la fila de tu subdominio, en **current ip**, pegá la IP externa del paso 3 y tocá **update ip**.

---

## Paso 5 — Entrar al servidor e instalar todo

### 5.1 Conectarte (desde el navegador, sin claves)

En **Instancias de VM**, en la fila de `viora`, tocá **SSH**. Se abre una ventana negra (la «terminal» del servidor) y quizá pide **Autorizar**: aceptá. Para pegar un comando usá **Ctrl+V** (en Mac, **Cmd+V**) y apretá **Enter**.

### 5.2 Descargar el proyecto

Tu repositorio es privado, así que primero creá un token de solo lectura:

1. En GitHub: tu foto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access**: *Only select repositories* → `viora-travel`. **Permissions** → **Contents: Read-only**. Generalo y copialo.
3. En la terminal del servidor (reemplazá `EL_TOKEN`):

```bash
git clone https://alansandes8-cell:EL_TOKEN@github.com/alansandes8-cell/viora-travel.git
cd viora-travel
git remote set-url origin https://github.com/alansandes8-cell/viora-travel.git
```

(La última línea quita el token del archivo de configuración. Para actualizar más adelante, `git pull` te va a pedir usuario y contraseña: el usuario es `alansandes8-cell` y la contraseña es el token.)

### 5.3 Preparar el servidor

```bash
bash deploy/instalar-servidor.sh
```

Instala Docker y, como este servidor tiene poca memoria, le agrega 4 GB de memoria de intercambio. Cuando termine, **cerrá la ventana del SSH y abrí una nueva** (botón **SSH** otra vez), y entrá a la carpeta:

```bash
cd viora-travel
```

### 5.4 Configurar

```bash
bash deploy/configurar.sh
```

Te pregunta el dominio (escribí `vioratravel.duckdns.org`, o el que hayas elegido), el WhatsApp y el email. Las contraseñas se generan solas.

### 5.5 Mantener el subdominio actualizado

La IP de Google puede cambiar si el servidor se reinicia; esto la actualiza sola cada 5 minutos. Reemplazá `vioratravel` y `TU_TOKEN_DUCKDNS`:

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * bash $HOME/viora-travel/deploy/duckdns.sh vioratravel TU_TOKEN_DUCKDNS") | crontab -
```

### 5.6 Encender la plataforma

```bash
docker compose up -d --build
```

**La primera vez tarda entre 20 y 40 minutos** en este servidor. Si la ventana del SSH se desconecta, no pasa nada: volvé a entrar, `cd viora-travel` y repetí el mismo comando (sigue desde donde quedó). Para ver cómo va:

```bash
docker compose ps
```

Cuando `app`, `db`, `caddy` y `backup` figuren como **running** (y `setup` como **exited (0)**), abrí **https://vioratravel.duckdns.org**. Si la primera vez da error de certificado, esperá un minuto y recargá.

### 5.7 Crear tu usuario del panel

```bash
docker compose run --rm setup pnpm admin:create --email alansandesmkt@gmail.com --name "Alan" --role owner
```

Muestra una **contraseña generada**. Copiala: no se vuelve a mostrar. Entrá a **https://vioratravel.duckdns.org/admin**, iniciá sesión y en **Ajustes** activá la **verificación en dos pasos**.

¡Listo, VIORA TRAVEL está en línea! 🎉

---

## Pasos siguientes (iguales a la guía de Oracle)

Seguí en [`DESPLIEGUE-GRATIS.md`](DESPLIEGUE-GRATIS.md):

- **Paso 7** — Copias de seguridad en tu Google Drive.
- **Paso 8** — Fotos de destinos, videos y avisos por email (opcional).
- **Paso 9** — La app en el celular y cómo pasársela a clientes.
- **Uso diario** y **dominio propio**. (Las actualizaciones con `bash deploy/actualizar.sh` también tardan 20–40 minutos en este servidor; mientras tanto, la web sigue funcionando con la versión anterior.)

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| La web no abre | Revisá que el servidor tenga marcado HTTP y HTTPS (Instancias de VM → `viora` → **Editar** → Firewall), que DuckDNS tenga la IP correcta y `docker compose ps` |
| Error de certificado HTTPS | Esperá 1–2 minutos y recargá. Mirá `docker compose logs caddy` |
| `permission denied` con Docker | Cerrá la ventana del SSH y abrí una nueva después de `instalar-servidor.sh` |
| La compilación se corta o queda trabada | Volvé a ejecutar `docker compose up -d --build`. Si sigue, `free -h` debe mostrar «Swap: 4.0Gi»; si no, ejecutá otra vez `bash deploy/instalar-servidor.sh` |
| Llegó un aviso de presupuesto | En **Facturación → Informes**, agrupá por **SKU** para ver qué se cobra y mandame una captura |
| El servidor aparece detenido | Instancias de VM → `viora` → **Iniciar**. La IP puede cambiar: DuckDNS se actualiza solo en 5 minutos |
