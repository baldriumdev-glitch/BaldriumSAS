const express = require('express');
const router = express.Router();
const repo = require('../db/beneficioRepositorio');

router.get('/parametros', async (_req, res) => {
    try {
        res.json(await repo.obtenerParametros());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/parametros', async (req, res) => {
    try {
        const { valorMinimoCompra, minimoReferidosVisitados, auditCtx } = req.body;
        const result = await repo.actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/compras-elegibles', async (_req, res) => {
    try {
        res.json(await repo.listarComprasElegibles());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { compraId, auditCtx } = req.body;
        const result = await repo.crearBeneficio(compraId, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/revision', async (_req, res) => {
    try {
        res.json(await repo.listarEnRevision());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/productos-disponibles', async (_req, res) => {
    try {
        res.json(await repo.listarProductosDisponibles());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const { estado, inventarioId, auditCtx } = req.body;
        await repo.cambiarEstadoBeneficio(Number(req.params.id), estado, inventarioId, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
