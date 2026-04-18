const express = require('express');
const router = express.Router();
const usuarioServicio = require('../servicios/Usuario/usuarioServicio');
const { verificarToken, verificarRol } = require('../seguridad/jwtMiddleware');

// Todas las rutas de este módulo requieren JWT + rol Director
router.use(verificarToken, verificarRol('Director'));

// GET /api/Usuario — lista todos los trabajadores con sus roles
router.get('/', async (req, res) => {
    try {
        res.json(await usuarioServicio.listar());
    } catch (err) {
        console.error('Error al listar usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Usuario/roles — lista todos los roles disponibles
router.get('/roles', async (req, res) => {
    try {
        res.json(await usuarioServicio.listarRoles());
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/Usuario — crea un trabajador nuevo
router.post('/', async (req, res) => {
    const { roles, ...datos } = req.body;
    try {
        const nuevo = await usuarioServicio.crear(datos, roles || []);
        res.status(201).json({ mensaje: 'Trabajador creado exitosamente.', trabajador: nuevo });
    } catch (err) {
        if (err.message.includes('Ya existe')) return res.status(409).json({ error: err.message });
        if (err.message.includes('requeridos')) return res.status(400).json({ error: err.message });
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PUT /api/Usuario/:cedula — actualiza datos y roles de un trabajador
router.put('/:cedula', async (req, res) => {
    const { roles, ...datos } = req.body;
    try {
        await usuarioServicio.actualizar(req.params.cedula, datos, roles || []);
        res.json({ mensaje: 'Trabajador actualizado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PATCH /api/Usuario/:cedula/estado — activa o desactiva un trabajador
router.patch('/:cedula/estado', async (req, res) => {
    const { activo } = req.body;
    try {
        await usuarioServicio.cambiarEstado(req.params.cedula, activo);
        res.json({ mensaje: `Trabajador ${activo ? 'activado' : 'desactivado'} correctamente.` });
    } catch (err) {
        console.error('Error al cambiar estado:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
