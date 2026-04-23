const express = require('express');
const router  = express.Router();
const repo    = require('../db/auditoriaRepositorio');

// GET /auditoria/inventario/info  (debe ir antes de /inventario)
router.get('/inventario/info', async (req, res) => {
    try {
        res.json(await repo.listarSistemaInventario(req.query.limite));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /auditoria/inventario
router.get('/inventario', async (req, res) => {
    try {
        res.json(await repo.listarInventario(req.query.limite));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /auditoria/inventario
router.post('/inventario', async (req, res) => {
    try {
        await repo.registrarInventario(req.body);
        res.status(201).json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /auditoria/sistema
router.get('/sistema', async (req, res) => {
    try {
        res.json(await repo.listarSistema(req.query.limite));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /auditoria/sistema
router.post('/sistema', async (req, res) => {
    try {
        await repo.registrarSistema(req.body);
        res.status(201).json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
