const express = require('express');
const router = express.Router();
const repo = require('../db/compraRepositorio');

router.get('/inventario-cocina', async (_req, res) => {
    try {
        const rows = await repo.inventarioCocina();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/cliente-por-persona', async (req, res) => {
    try {
        const data = await repo.clientePorPersona(Number(req.query.personaId));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/crear-cliente', async (req, res) => {
    try {
        const { personaId, auditCtx, ...datos } = req.body;
        const result = await repo.crearClienteDesdeProspecto(personaId, datos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/nueva', async (req, res) => {
    try {
        const { cedulaCliente, actor, formaPago, notas, items, referidos, auditCtx } = req.body;
        const result = await repo.crearCompra(cedulaCliente, actor, formaPago, notas, items, referidos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/cliente-libre', async (req, res) => {
    try {
        const { auditCtx, ...datos } = req.body;
        const result = await repo.registrarClienteLibre(datos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/mis-compras', async (req, res) => {
    try {
        const { cedula } = req.query;
        const rows = await repo.listarComprasTrabajador(cedula);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
