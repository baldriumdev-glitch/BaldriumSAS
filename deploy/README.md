# Despliegue de BaldriumSAS (Ubuntu + nginx)

## Arquitectura

```
                         ┌───────────────── Servidor ─────────────────┐
 Navegador ──HTTPS──►  nginx :443                                     │
                         ├── /      → /var/www/baldrium-frontend      │  (Angular compilado)
                         └── /api/  → logica        127.0.0.1:3000    │  (Node + PM2)
                                        └─► persistencia 127.0.0.1:3001  (Node + PM2, NO pública)
                                               └─► MySQL  127.0.0.1:3306
                         └────────────────────────────────────────────┘
```

- Solo nginx está expuesto a internet (puertos 80/443).
- **persistencia no tiene autenticación**, por eso nunca debe ser accesible desde fuera;
  solo `logica` la llama por `127.0.0.1`.
- El front y la API comparten dominio, así que no hay problemas de CORS.

Archivos de esta carpeta:

| Archivo | Para qué sirve |
|---|---|
| `nginx/baldrium.conf` | Sitio de nginx (front + proxy de la API) |
| `ecosystem.config.js` | PM2: arranca y mantiene vivos `logica` y `persistencia` |

---

## 1. Preparar el servidor (una sola vez)

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx mysql-server

# PM2 (gestor de procesos Node)
sudo npm install -g pm2

# Firewall: solo SSH y web
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Base de datos

```bash
sudo mysql
```
```sql
CREATE DATABASE baldrium_sas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'baldrium'@'localhost' IDENTIFIED BY 'UNA_CONTRASEÑA_SEGURA';
GRANT ALL PRIVILEGES ON baldrium_sas.* TO 'baldrium'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Luego importa el esquema/datos:
```bash
mysql -u baldrium -p baldrium_sas < respaldo.sql
```

## 3. Backend (logica + persistencia)

```bash
sudo mkdir -p /opt/baldrium && sudo chown $USER /opt/baldrium
git clone <URL_DEL_REPO_BALDRIUMSAS> /opt/baldrium/backend
cd /opt/baldrium/backend

(cd persistencia && npm install --omit=dev)
(cd logica && npm install --omit=dev)
```

Crea los `.env` (no están en git):

`persistencia/.env`
```
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=baldrium
DB_PASSWORD=UNA_CONTRASEÑA_SEGURA
DB_NAME=baldrium_sas
```

`logica/.env`
```
PORT=3000
PERSISTENCIA_URL=http://127.0.0.1:3001
JWT_SECRET=<cadena larga y aleatoria, distinta a la de desarrollo>
JWT_EXPIRES_IN=8h
EMAIL_HOST=...
EMAIL_PORT=...
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=...
```
> Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Arranca con PM2:
```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup      # ejecuta el comando que imprime, para que arranque al reiniciar el servidor
```

Comprueba:
```bash
curl http://127.0.0.1:3001/   # {"ok":true,"servicio":"persistencia",...}
curl http://127.0.0.1:3000/   # API BaldriumSAS funcionando
pm2 logs                      # ver logs
```

## 4. Frontend

Compila (en tu PC o en el servidor). `ng build` usa la configuración de producción,
que reemplaza `environment.ts` por `environment.prod.ts` (`apiUrl: '/api'`).

```bash
cd Baldrium-Frontend
npm install
npx ng build
```

Copia el resultado al servidor:
```bash
sudo mkdir -p /var/www/baldrium-frontend
# desde tu PC:
scp -r dist/baldrium-frontend/browser usuario@SERVIDOR:/tmp/
# en el servidor:
sudo rm -rf /var/www/baldrium-frontend/browser
sudo mv /tmp/browser /var/www/baldrium-frontend/browser
```

## 5. nginx

```bash
sudo cp /opt/baldrium/backend/deploy/nginx/baldrium.conf /etc/nginx/sites-available/baldrium.conf
sudo nano /etc/nginx/sites-available/baldrium.conf     # cambia tudominio.com
sudo ln -s /etc/nginx/sites-available/baldrium.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t              # valida la sintaxis
sudo systemctl reload nginx
```

Abre `http://tudominio.com` y prueba el login.

## 6. HTTPS (Let's Encrypt, gratis)

Requiere que el dominio ya apunte (registro DNS A) a la IP del servidor.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```
Certbot agrega el bloque `listen 443 ssl` y la redirección HTTP→HTTPS automáticamente,
y renueva el certificado solo.

---

## Actualizar después de un cambio

**Backend**
```bash
cd /opt/baldrium/backend && git pull
(cd logica && npm install --omit=dev) && (cd persistencia && npm install --omit=dev)
pm2 restart all
```

**Frontend**: vuelve a hacer `ng build` y repite la copia del paso 4 (no hace falta recargar nginx).

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| `502 Bad Gateway` en `/api` | `logica` no está corriendo → `pm2 status`, `pm2 logs baldrium-logica` |
| Error 500 al consultar datos | `persistencia` no conecta a MySQL → revisa `persistencia/.env` y `pm2 logs baldrium-persistencia` |
| `404` al recargar en `/inventario` | Falta `try_files ... /index.html` en nginx |
| El front llama a `localhost:3000` | Se compiló con `--configuration development`; usa `npx ng build` |
| Cambios del front no se ven | Caché del navegador; `index.html` ya va sin caché, prueba Ctrl+F5 |
| Logs de nginx | `/var/log/nginx/error.log` y `access.log` |
