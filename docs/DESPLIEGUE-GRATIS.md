# Poner VIORA TRAVEL en línea gratis (Oracle Cloud + DuckDNS)

Guía paso a paso pensada para hacerla sin experiencia técnica. Tiempo estimado: entre 1 y 2 horas.

**Qué vas a tener al final:** la web funcionando en `https://tu-nombre.duckdns.org`, con HTTPS, base de datos, copias diarias en tu Google Drive y el panel en `/admin`.

**Costo:** US$ 0. Oracle pide una tarjeta para verificar tu identidad, pero no cobra mientras uses solo recursos «Always Free». Más adelante podés sumar un dominio propio (por ejemplo, `viora-travel.com`); está explicado al final.

> **¿Oracle no te deja crear la cuenta?** Seguí la guía alternativa con Google Cloud: [`DESPLIEGUE-GOOGLE-CLOUD.md`](DESPLIEGUE-GOOGLE-CLOUD.md).

> Las pantallas de Oracle cambian seguido. Si un botón tiene otro nombre, buscá el más parecido. Si algo no coincide, mandame una captura y lo resolvemos.

---

## Paso 1 — Crear la cuenta de Oracle Cloud

1. Entrá a **https://www.oracle.com/cloud/free/** y tocá **Start for free**.
2. Completá tus datos. En **Home Region** elegí una región **cercana y que no vas a poder cambiar después**. Recomendado: **Brazil East (Sao Paulo)**; alternativa: **Chile Central (Santiago)**.
   - Si al crear el servidor (paso 3) aparece «Out of capacity», es porque la región no tiene servidores gratuitos libres en ese momento. Reintentá unas horas después.
3. Verificá tu tarjeta. Oracle puede hacer una retención temporal de un monto chico para validarla.
4. Esperá el email de bienvenida y entrá a la consola: **https://cloud.oracle.com**.

### Recomendado: evitar que Oracle apague el servidor por «inactividad»

Oracle puede recuperar servidores gratuitos con poco uso (menos del 20% de procesador, red y memoria durante 7 días). Una web que recién arranca puede quedar en esa situación.

Según avisos de Oracle, pasar la cuenta a **Pay As You Go** evita ese apagado y **no genera cobros mientras te mantengas dentro de lo gratuito** ([fuente](https://blog.51sec.org/2023/02/oracle-cloud-cleaning-up-idle-compute.html), [documentación oficial](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)). Confirmá el texto actual en la consola antes de hacerlo.

1. Menú ☰ → **Billing & Cost Management** → **Upgrade and Manage Payment** → **Pay As You Go**.
2. Inmediatamente después creá una alerta de gasto: **Billing → Budgets → Create Budget**, monto **US$ 1**, alerta al **1%**, con tu email. Si algún día aparece un cargo, te enterás enseguida.

---

## Paso 2 — Crear tu subdominio gratuito (DuckDNS)

1. Entrá a **https://www.duckdns.org** e iniciá sesión con tu cuenta de Google.
2. En **sub domain** escribí un nombre, por ejemplo `vioratravel`, y tocá **add domain**. Tu dirección va a ser `vioratravel.duckdns.org`.
3. Copiá y guardá el **token** que aparece arriba (una cadena larga de letras y números). Lo vas a usar en el paso 6.

---

## Paso 3 — Crear el servidor

1. En la consola de Oracle: menú ☰ → **Compute** → **Instances** → **Create instance**.
2. **Name**: `viora`.
3. **Image and shape** → **Edit**:
   - **Image** → **Change image** → **Canonical Ubuntu** → versión **24.04** (no la «Minimal»).
   - **Shape** → **Change shape** → **Ampere** → **VM.Standard.A1.Flex** → **2 OCPU** y **8 GB** de memoria. Aparece la etiqueta «Always Free-eligible».
4. **Networking**: dejá lo que viene por defecto (crea una red nueva) y verificá que esté marcado **Assign a public IPv4 address**.
5. **Add SSH keys** → **Generate a key pair for me** → tocá **Save private key** y **Save public key**. **Guardá los dos archivos en un lugar seguro**: sin la clave privada no vas a poder entrar al servidor.
6. **Boot volume**: podés dejar el tamaño por defecto (o subirlo a 100 GB; hasta 200 GB en total es gratis).
7. Tocá **Create**. En 1 o 2 minutos el estado pasa a **Running**. Anotá la **Public IP address** (por ejemplo, `152.67.10.20`).

---

## Paso 4 — Abrir los puertos web en Oracle

Oracle bloquea todo salvo SSH. Hay que habilitar la web:

1. En la página de la instancia, en **Primary VNIC**, entrá a la **Subnet**.
2. **Security Lists** → **Default Security List** → **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0` · **IP Protocol**: TCP · **Destination Port Range**: `80,443`
3. **Add Ingress Rules** para guardar.

(El firewall interno de Ubuntu lo abre el script del paso 6.)

---

## Paso 5 — Apuntar el subdominio al servidor

1. Volvé a **duckdns.org**.
2. En la fila de tu subdominio, en **current ip**, pegá la IP pública del paso 3 y tocá **update ip**.

---

## Paso 6 — Entrar al servidor e instalar todo

### 6.1 Conectarte

**En Windows**: abrí **PowerShell**. La primera vez, protegé la clave reemplazando la ruta por la tuya:

```powershell
icacls "C:\Users\TU_USUARIO\Downloads\ssh-key.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i "C:\Users\TU_USUARIO\Downloads\ssh-key.key" ubuntu@TU_IP
```

**En Mac**: abrí **Terminal**:

```bash
chmod 600 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@TU_IP
```

Si pregunta `Are you sure you want to continue connecting?`, escribí `yes`. Ya estás dentro del servidor.

### 6.2 Descargar el proyecto

Si tu repositorio de GitHub es **público**:

```bash
git clone https://github.com/alansandes8-cell/viora-travel.git
cd viora-travel
```

Si es **privado** (lo más probable), creá primero un token de solo lectura:

1. En GitHub: tu foto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access**: *Only select repositories* → `viora-travel`. **Permissions** → **Contents: Read-only**. Generalo y copialo.
3. En el servidor:

```bash
git clone https://alansandes8-cell:EL_TOKEN@github.com/alansandes8-cell/viora-travel.git
cd viora-travel
git remote set-url origin https://github.com/alansandes8-cell/viora-travel.git
```

(La última línea quita el token del archivo de configuración. Para actualizar más adelante, `git pull` te va a pedir usuario y contraseña: el usuario es `alansandes8-cell` y la contraseña es el token.)

### 6.3 Preparar el servidor

```bash
bash deploy/instalar-servidor.sh
exit
```

El script instala Docker y abre los puertos. Después volvé a entrar con el mismo comando `ssh` del paso 6.1 y entrá a la carpeta:

```bash
cd viora-travel
```

### 6.4 Configurar

```bash
bash deploy/configurar.sh
```

Te pregunta el dominio (escribí `vioratravel.duckdns.org`, o el que hayas elegido), el WhatsApp y el email. Las contraseñas se generan solas.

### 6.5 Mantener el subdominio actualizado

Reemplazá `vioratravel` y `TU_TOKEN_DUCKDNS` por los tuyos:

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * bash $HOME/viora-travel/deploy/duckdns.sh vioratravel TU_TOKEN_DUCKDNS") | crontab -
```

### 6.6 Encender la plataforma

```bash
docker compose up -d --build
```

La primera vez tarda entre 5 y 15 minutos, porque construye la aplicación. Para ver cómo va:

```bash
docker compose ps
```

Cuando `app`, `db`, `caddy` y `backup` figuren como **running** (y `setup` como **exited (0)**), abrí en el navegador **https://vioratravel.duckdns.org**. Caddy pide el certificado HTTPS automáticamente: si la primera vez da error, esperá un minuto y recargá.

### 6.7 Crear tu usuario del panel

```bash
docker compose run --rm setup pnpm admin:create --email alansandesmkt@gmail.com --name "Alan" --role owner
```

Va a mostrar una **contraseña generada**. Copiala: no se vuelve a mostrar. Entrá a **https://vioratravel.duckdns.org/admin**, iniciá sesión y en **Ajustes** activá la **verificación en dos pasos**.

¡Listo, VIORA TRAVEL está en línea! 🎉

---

## Paso 7 — Copias de seguridad en tu Google Drive (recomendado)

El servidor ya guarda una copia diaria de la base en `~/viora-travel/backups`. Para no perderlas si le pasa algo al servidor, subilas también a Google Drive.

1. **En tu computadora** descargá rclone desde **https://rclone.org/downloads/**, descomprimilo y, en esa carpeta, abrí PowerShell o Terminal y ejecutá:
   ```
   rclone authorize "drive"
   ```
   Se abre el navegador: iniciá sesión con tu Google y aceptá. En la terminal aparece un texto largo entre `--->` y `<---End paste`. Copialo.
2. **En el servidor**:
   ```bash
   rclone config
   ```
   Respondé: `n` (new remote) → nombre: `drive` → tipo: `drive` → **client_id** y **client_secret**: Enter (vacío) → scope: `1` → **service_account_file**: Enter → **Edit advanced config**: `n` → **Use web browser**: `n` → pegá el texto copiado → **Shared Drive**: `n` → `y` para confirmar → `q` para salir.
3. Probalo y programá la subida diaria:
   ```bash
   bash deploy/copia-a-drive.sh && echo OK
   (crontab -l 2>/dev/null; echo "30 4 * * * bash $HOME/viora-travel/deploy/copia-a-drive.sh") | crontab -
   ```
   En tu Drive va a aparecer la carpeta `viora-backups`. La copia del día aparece después de que corre la primera copia diaria.

Para restaurar una copia, seguí la sección «Restaurar una copia» del `README.md`.

---

## Paso 8 — Activar extras gratuitos (opcional)

Editá el archivo de configuración con `nano .env` (guardás con Ctrl+O y Enter, y salís con Ctrl+X). Después aplicá los cambios con `bash deploy/actualizar.sh`.

| Qué | Dónde se consigue | Variable del `.env` |
|---|---|---|
| **Viorita-bot con IA y texto libre inteligente** (recomendado) | https://aistudio.google.com/apikey → iniciá sesión con tu Google → **Create API key** → copiala. Es gratis, con un límite diario de consultas | `GEMINI_API_KEY=la clave` |
| Fotos de destinos (extra) | Las fotos de los lugares emblemáticos salen solas de Wikipedia. Opcional: https://unsplash.com/developers → *New Application* → «Access Key» | `UNSPLASH_ACCESS_KEY` |
| Más fotos | https://www.pexels.com/api/ → «Your API Key» | `PEXELS_API_KEY` |
| Videos | https://console.cloud.google.com → crear proyecto → habilitar «YouTube Data API v3» → Credenciales → Clave de API | `YOUTUBE_API_KEY` |
| Avisos por email | Tu cuenta de Google → Seguridad → Verificación en 2 pasos (activarla) → **Contraseñas de aplicaciones** → crear «VIORA» | `SMTP_USER=tu@gmail.com`, `SMTP_PASS=la contraseña de 16 letras`, `SMTP_FROM=tu@gmail.com` |
| Legajo de la agencia | Tu habilitación de agencia de viajes | `AGENCY_LEGAL_ID` |

En **Ajustes → Estado de integraciones** del panel ves qué quedó activo.

---

## Paso 9 — La app en el celular (gratis)

VIORA es una app instalable (PWA): no pasa por Google Play ni App Store, se instala desde el navegador y se actualiza sola cada vez que actualizás el servidor.

- **Clientes:** mandales `https://TU-DOMINIO/app` (en el panel, «App para clientes», está el QR y un botón para enviarlo por WhatsApp).
  - Android (Chrome): botón «Instalar la app» o menú ⋮ → «Instalar app».
  - iPhone (Safari): Compartir → «Agregar a inicio».
- **Vos (panel):** abrí `https://TU-DOMINIO/admin` en el celu e instalalo igual: queda como otra app, «VIORA Panel», que abre directo en el panel.
- Requiere HTTPS (Caddy ya lo configura). No funciona con la vista previa de Claude.
- Si más adelante querés estar en las tiendas: Google Play cuesta USD 25 una sola vez (se puede publicar esta misma app con PWABuilder); App Store cuesta USD 99 por año y exige más trabajo.

## Uso diario

| Para… | Comando (dentro de `~/viora-travel`) |
|---|---|
| Actualizar a la última versión | `bash deploy/actualizar.sh` |
| Ver si todo está funcionando | `docker compose ps` |
| Ver errores de la aplicación | `docker compose logs --tail 100 app` |
| Reiniciar | `docker compose restart app` |
| Crear otro usuario del panel | `docker compose run --rm setup pnpm admin:create --email ... --name "..." --role agent` |

---

## Dominio propio (ej.: `viora-travel.com`, comprado en GoDaddy)

1. **En GoDaddy** → *Mis productos* → junto al dominio, **DNS** (o *Administrar DNS*):
   - Editá el registro **A** con nombre **`@`** y poné como valor la IP del servidor. Si hay más de un registro A con nombre `@` (por ejemplo «Parked»), dejá solo uno.
   - Verificá que exista el registro **CNAME** con nombre **`www`** y valor **`@`** (GoDaddy lo crea por defecto). Si no está, crealo.
   - Si el dominio tiene activado **Reenvío** (*Forwarding*), desactivalo.
2. Esperá a que se propague (de minutos a unas horas). Para comprobarlo, en el servidor: `nslookup viora-travel.com` debe mostrar la IP del servidor.
3. **En el servidor**, dentro de `viora-travel`:
   ```bash
   sed -i 's/^DOMAIN=.*/DOMAIN=viora-travel.com/; s#^APP_URL=.*#APP_URL=https://viora-travel.com#' .env
   echo "OLD_DOMAIN=vioratravel.duckdns.org" >> .env
   bash deploy/actualizar.sh
   ```
   Caddy pide solo los certificados HTTPS de `viora-travel.com` y `www.viora-travel.com`. `www` redirige a la dirección sin `www`, y los enlaces viejos de DuckDNS redirigen a la nueva (por eso conviene dejar DuckDNS activo).
4. La app instalada en celulares con la dirección vieja sigue funcionando (redirige), pero conviene reinstalarla desde `https://viora-travel.com/app`.

> Si algún día el servidor se detiene y Oracle le asigna otra IP, hay que actualizar el registro **A** en GoDaddy.

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| «Out of capacity» al crear el servidor | Reintentá más tarde o a la madrugada. También podés probar con 1 OCPU y 6 GB |
| `Permission denied (publickey)` al conectarte | Revisá la ruta de la clave privada y que el usuario sea `ubuntu` |
| `WARNING: UNPROTECTED PRIVATE KEY FILE` (Windows) | Ejecutá el comando `icacls` del paso 6.1 |
| La web no abre | Revisá el paso 4 (puertos 80 y 443), que DuckDNS tenga la IP correcta y `docker compose ps` |
| Error de certificado HTTPS | Esperá 1–2 minutos y recargá. Mirá `docker compose logs caddy` |
| `permission denied` con Docker | Cerrá la sesión (`exit`) y volvé a entrar después de `instalar-servidor.sh` |
| El servidor quedó «Stopped» | Oracle lo apagó por inactividad: encendelo desde la consola (**Start**) y considerá el paso «Pay As You Go» del paso 1 |
