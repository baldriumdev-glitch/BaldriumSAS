/**
 * Módulo Telemercadeo — Índice de rutas
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo es el punto de entrada del módulo. Monta los sub-routers
 * de cada rol por separado para una separación clara de responsabilidades.
 *
 * Roles disponibles:
 *  - Asesor comercial → asesorComercialRutas.js
 *  - Telemercader     → telemercaderRutas.js
 */

const express = require('express');
const router = express.Router();

const asesorComercialRutas = require('./AsesorComercial/asesorComercialRutas');


// Cada sub-router aplica su propio verificarToken + verificarRol internamente
router.use(asesorComercialRutas);


module.exports = router;
