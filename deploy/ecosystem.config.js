// PM2: mantiene logica y persistencia corriendo y las reinicia si fallan
// o si el servidor se reinicia.
//   Uso (desde la raíz del repo en el servidor):  pm2 start deploy/ecosystem.config.js
// Cada servicio lee su propio .env desde su carpeta (cwd).
module.exports = {
  apps: [
    {
      name: 'baldrium-persistencia',
      cwd: './persistencia',
      script: 'server.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
      max_memory_restart: '300M',
    },
    {
      name: 'baldrium-logica',
      cwd: './logica',
      script: 'server.js',
      env: { NODE_ENV: 'production', PORT: 3000 },
      max_memory_restart: '300M',
    },
  ],
};
