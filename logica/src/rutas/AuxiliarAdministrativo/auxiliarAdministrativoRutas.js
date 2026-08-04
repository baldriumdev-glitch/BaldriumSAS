/**
 * Módulo Auxiliar Administrativo — Índice de rutas
 * ─────────────────────────────────────────────────────────────────────────────
 * Monta los sub-routers de cada sección por separado, igual que el módulo
 * Telemercadeo. Ambos sub-routers exigen internamente el rol
 * "Auxiliar Administrativo".
 */

const express = require('express');
const router = express.Router();

const aprobarComprasRutas    = require('./AprobarCompras/aprobarComprasRutas');
const aprobarBeneficiosRutas = require('./AprobarBeneficios/aprobarBeneficiosRutas');

router.use('/aprobar-compras',    aprobarComprasRutas);
router.use('/aprobar-beneficios', aprobarBeneficiosRutas);

module.exports = router;
