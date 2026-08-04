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

router.get('/semana/visitadas', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const rows = await repo.listarSemanaVisitadas(inicio, fin);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/semana/por-gestionar', async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        const rows = await repo.listarSemanaPorGestionar(inicio, fin);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
        const { visitaId, estado, notas } = req.body;
        await repo.cambiarEstado(visitaId, estado, notas);
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

router.get('/fallidas', async (_req, res) => {
    try {
        const rows = await repo.listarFallidas();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/fallidas/kpi', async (_req, res) => {
    try {
        const kpi = await repo.kpiVisitasFallidas();
        res.json(kpi);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/fallidas/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await repo.buscarFallidas(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/semana/visitadas/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await repo.buscarVisitadas(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/semana/por-gestionar/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const rows = await repo.buscarPorGestionar(q);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/:id/estado', async (req, res) => {
    try {
        const { estado, notas, auditCtx } = req.body;
        await repo.cambiarEstadoTelemercader(Number(req.params.id), estado, notas, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const datos = await repo.obtenerDetalle(Number(req.params.id));
        if (!datos) return res.status(404).json({ error: 'Visita no encontrada' });
        res.json(datos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { auditCtx, ...datos } = req.body;
        await repo.editarVisita(Number(req.params.id), datos, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/:id/cancelar', async (req, res) => {
    try {
        const { motivo, auditCtx } = req.body;
        await repo.cancelarVisita(Number(req.params.id), motivo, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
