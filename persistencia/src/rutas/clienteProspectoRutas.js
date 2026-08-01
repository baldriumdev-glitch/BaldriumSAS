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

module.exports = router;
