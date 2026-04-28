const express = require('express');
const router = express.Router();
const repo = require('../db/visitaRepositorio');

router.get('/semana', async (req, res) => {
    const { cedula, inicio, fin } = req.query;
    const rows = await repo.listarSemana(cedula, inicio, fin);
    res.json(rows);
});

router.get('/mes', async (req, res) => {
    const { cedula, anio, mes } = req.query;
    const rows = await repo.listarMes(cedula, Number(anio), Number(mes));
    res.json(rows);
});

router.get('/buscar', async (req, res) => {
    const { cedula, q = '' } = req.query;
    const rows = await repo.buscar(cedula, q);
    res.json(rows);
});

router.get('/kpi', async (req, res) => {
    const { cedula, inicio, fin } = req.query;
    const kpi = await repo.kpiSemana(cedula, inicio, fin);
    res.json(kpi);
});

router.get('/detalle', async (req, res) => {
    const { personaId } = req.query;
    const datos = await repo.detallePersona(Number(personaId));
    if (!datos) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(datos);
});

router.get('/compras', async (req, res) => {
    const { personaId } = req.query;
    const rows = await repo.historialCompras(Number(personaId));
    res.json(rows);
});

router.post('/estado', async (req, res) => {
    try {
        const { visitaId, estado } = req.body;
        await repo.cambiarEstado(visitaId, estado);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/historial-visitas', async (req, res) => {
    const { personaId } = req.query;
    const rows = await repo.historialVisitas(Number(personaId));
    res.json(rows);
});

router.get('/alimentacion', async (_req, res) => {
    try {
        const rows = await repo.inventarioAlimentacion();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/suplemento', async (req, res) => {
    try {
        const { visitaId, suplementos, actor } = req.body;
        await repo.guardarSuplemento(visitaId, suplementos, actor);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
