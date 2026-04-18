const express = require('express');
const cors = require('cors');

const authRutas    = require('./rutas/authRutas');
const usuarioRutas = require('./rutas/usuarioRutas');

const { verificarToken } = require('./seguridad/jwtMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// ─── Rutas públicas ───────────────────────────────────────────────────────────
app.use('/api/auth', authRutas);

// ─── Rutas protegidas ─────────────────────────────────────────────────────────
app.use('/api/Usuario', usuarioRutas);

app.get('/api/protegido', verificarToken, (req, res) => {
    res.json({
        mensaje: `Bienvenido, ${req.usuario.nombre}`,
        roles: req.usuario.roles
    });
});

// ─── Ruta base ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('API BaldriumSAS funcionando');
});

module.exports = app;
