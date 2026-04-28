const express = require('express');
const trabajadorRutas = require('./rutas/trabajadorRutas');
const inventarioRutas = require('./rutas/inventarioRutas');
const auditoriaRutas  = require('./rutas/auditoriaRutas');
const visitaRutas     = require('./rutas/visitaRutas');
const compraRutas     = require('./rutas/compraRutas');

const app = express();
app.use(express.json());

app.use('/trabajadores', trabajadorRutas);
app.use('/inventario',   inventarioRutas);
app.use('/auditoria',    auditoriaRutas);
app.use('/visitas',      visitaRutas);
app.use('/compras',      compraRutas);

app.get('/', (_req, res) => res.json({ ok: true, servicio: 'persistencia', puerto: process.env.PORT || 3001 }));

module.exports = app;
