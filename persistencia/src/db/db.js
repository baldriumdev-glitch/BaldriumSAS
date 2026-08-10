const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'baldrium_sas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Sin este listener, si el servidor de MySQL cierra una conexión inactiva del pool
// (algo normal en bases de datos administradas como Railway), mysql2 emite un
// 'error' en el pool. Un EventEmitter sin listener para 'error' relanza esa
// excepción y tumba todo el proceso de Node — por eso la persistencia se caía
// entera ante un simple "Connection lost". Con el listener, el pool solo
// descarta la conexión muerta y crea una nueva en la siguiente consulta.
pool.on('error', (err) => {
    console.error('[MySQL Pool] Error de conexión (recuperado automáticamente):', err.message);
});

module.exports = pool;
