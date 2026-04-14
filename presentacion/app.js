const express    = require('express');
const cors       = require('cors');

// Rutas
const authRutas       = require('./rutas/authRutas');
const trabajadorRutas = require('./rutas/trabajadorRutas');

// Middleware de seguridad
const { verificarToken } = require('../logica/seguridad/jwtMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// ─── Rutas públicas ───────────────────────────────────────────────────────────
app.use('/api/auth',       authRutas);

// ─── Rutas protegidas (requieren JWT válido) ──────────────────────────────────
app.use('/api/trabajador', trabajadorRutas);
// Ejemplo: cualquier ruta bajo /api/protegido exige token
app.get('/api/protegido', verificarToken, (req, res) => {
    res.json({
        mensaje: `Bienvenido, ${req.usuario.nombre}`,
        roles:   req.usuario.roles
    });
});

// ─── Ruta base ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('API BaldriumSAS funcionando 🚀');
});

module.exports = app;