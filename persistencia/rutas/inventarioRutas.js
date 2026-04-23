const express = require('express');
const router  = express.Router();
const repo    = require('../db/inventarioRepositorio');

// GET /inventario/existe-nombre?nombre=&excluirId=  (debe ir antes de /:id)
router.get('/existe-nombre', async (req, res) => {
    try {
        const { nombre, excluirId } = req.query;
        const existe = await repo.existeNombre(nombre, excluirId ? parseInt(excluirId) : null);
        res.json({ existe });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /inventario
router.get('/', async (_req, res) => {
    try {
        res.json(await repo.listarTodos());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /inventario/:id
router.get('/:id', async (req, res) => {
    try {
        const producto = await repo.buscarPorId(parseInt(req.params.id));
        if (!producto) return res.status(404).json({ error: 'No encontrado' });
        res.json(producto);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /inventario
router.post('/', async (req, res) => {
    try {
        const id = await repo.crearProducto(req.body);
        res.status(201).json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /inventario/:id
router.put('/:id', async (req, res) => {
    try {
        await repo.actualizarProducto(parseInt(req.params.id), req.body);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /inventario/:id
router.delete('/:id', async (req, res) => {
    try {
        await repo.eliminarProducto(parseInt(req.params.id));
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
