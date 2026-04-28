const express = require('express');
const cors = require('cors');

const authRutas = require('./rutas/Login/authRutas');
const usuarioRutas = require('./rutas/Usuario/usuarioRutas');
const perfilRutas = require('./rutas/Usuario/perfilRutas');
const inventarioRutas    = require('./rutas/Inventario/inventarioRutas');
const telemercadeoRutas  = require('./rutas/Telemercadeo/telemercadeoRutas');

const { verificarToken } = require('./seguridad/jwtMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// ─── Rutas públicas ───────────────────────────────────────────────────────────
app.use('/api/auth', authRutas);

// ─── Rutas protegidas ─────────────────────────────────────────────────────────
app.use('/api/Usuario', usuarioRutas);
app.use('/api/perfil', perfilRutas);
app.use('/api/Inventario', inventarioRutas);
app.use('/api/telemercadeo', telemercadeoRutas);

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
