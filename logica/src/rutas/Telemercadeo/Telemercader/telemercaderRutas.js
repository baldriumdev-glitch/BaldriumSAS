const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const svc = require('../../../servicios/Telemercadeo/Telemercader/telemercaderServicio');

// Todas las rutas de este router requieren token válido + rol Telemercaderista
router.use(verificarToken, verificarRol('Telemercaderista'));

// ─── Prospectos ───────────────────────────────────────────────────────────────

router.get('/prospectos/pendientes', async (_req, res) => {
    try {
        const rows = await svc.listarPendientes();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/prospectos/en-gestion', async (_req, res) => {
    try {
        const rows = await svc.listarEnGestion();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Visitas de la semana ───────────────────────────────────────────────────────

router.get('/visitas/semana/visitadas', async (_req, res) => {
    try {
        const rows = await svc.listarVisitasSemanaVisitadas();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/semana/por-gestionar', async (_req, res) => {
    try {
        const rows = await svc.listarVisitasSemanaPorGestionar();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
