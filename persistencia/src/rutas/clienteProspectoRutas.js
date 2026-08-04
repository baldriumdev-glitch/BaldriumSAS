const express = require('express');
const router = express.Router();
const repo = require('../db/clienteProspectoRepositorio');

router.get('/pendientes', async (_req, res) => {
    try {
        const rows = await repo.listarPendientes();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/en-gestion', async (_req, res) => {
    try {
        const rows = await repo.listarEnGestion();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/pendientes/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await repo.buscarPendientes(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/en-gestion/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await repo.buscarEnGestion(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/agendar-visita', async (req, res) => {
    try {
        const { auditCtx, ...datos } = req.body;
        const result = await repo.agendarVisita(Number(req.params.id), datos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const { estado, auditCtx } = req.body;
        await repo.cambiarEstado(Number(req.params.id), estado, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
