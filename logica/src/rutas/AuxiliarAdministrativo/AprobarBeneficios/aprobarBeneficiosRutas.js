const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../../utils/requestHelpers');
const svc = require('../../../servicios/AuxiliarAdministrativo/aprobarBeneficiosServicio');

// Todas las rutas de este router requieren token válido + rol Auxiliar Administrativo
router.use(verificarToken, verificarRol('Auxiliar Administrativo'));

router.get('/', async (_req, res) => {
    try {
        const rows = await svc.listarEnRevision();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/productos', async (_req, res) => {
    try {
        const rows = await svc.listarProductosDisponibles();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const { estado, inventarioId } = req.body;
        await svc.cambiarEstado(Number(req.params.id), estado, inventarioId, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
