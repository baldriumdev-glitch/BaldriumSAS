const express = require('express');
const router  = express.Router();
const usuarioServicio = require('../servicios/Usuario/usuarioServicio');
const { verificarToken, verificarRol } = require('../seguridad/jwtMiddleware');
const auditoria = require('../db/auditoriaRepositorio');

// Todas las rutas requieren JWT + rol Director
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

// GET /api/Usuario/roles — lista los roles disponibles
router.get('/roles', async (req, res) => {
    try {
        res.json(await usuarioServicio.listarRoles());
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Usuario/auditoria — últimos 400 registros de auditoria_sistema
router.get('/auditoria', async (_req, res) => {
    try {
        res.json(await auditoria.listarSistema(400));
    } catch (err) {
        console.error('Error al listar auditoría:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/Usuario — crea un trabajador nuevo
router.post('/', async (req, res) => {
    const { roles, ...datos } = req.body;
    const ip     = auditoria.extraerIP(req);
    const device = auditoria.extraerDispositivo(req);

    try {
        const nuevo = await usuarioServicio.crear(datos, roles || []);

        auditoria.registrarSistema({
            cedulaTrabajador: req.usuario.cedula,
            nombreTrabajador: req.usuario.nombre,
            tipoAccion:       'CREAR',
            tablaAfectada:    'trabajador',
            valorNuevo:       { Cedula: datos.Cedula, Nombre: datos.Nombre, CodigoTrabajador: datos.CodigoTrabajador, Celular: datos.Celular, CorreoElectronico: datos.CorreoElectronico, roles },
            direccionIP:      ip,
            dispositivo:      device,
            resultado:        'EXITOSO',
            descripcion:      `Trabajador creado: ${datos.Nombre} (${datos.Cedula})`,
        });

        res.status(201).json({ mensaje: 'Trabajador creado exitosamente.', trabajador: nuevo });
    } catch (err) {
        if (err.message.includes('ya está registrada') || err.message.includes('ya está en uso')) {
            auditoria.registrarSistema({
                cedulaTrabajador: req.usuario.cedula,
                nombreTrabajador: req.usuario.nombre,
                tipoAccion:       'CREAR',
                tablaAfectada:    'trabajador',
                direccionIP:      ip,
                dispositivo:      device,
                resultado:        'FALLIDO',
                descripcion:      err.message,
            });
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('requeridos')) return res.status(400).json({ error: err.message });
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PUT /api/Usuario/:cedula — actualiza datos y roles de un trabajador
router.put('/:cedula', async (req, res) => {
    const { roles, ...datos } = req.body;
    const cedula = req.params.cedula;
    const ip     = auditoria.extraerIP(req);
    const device = auditoria.extraerDispositivo(req);

    try {
        // Captura valores anteriores para la auditoría
        const anterior = await usuarioServicio.obtenerUno(cedula);

        await usuarioServicio.actualizar(cedula, datos, roles || []);

        auditoria.registrarSistema({
            cedulaTrabajador: req.usuario.cedula,
            nombreTrabajador: req.usuario.nombre,
            tipoAccion:       'EDITAR',
            tablaAfectada:    'trabajador',
            valorAnterior:    anterior
                ? { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion, roles: anterior.roles }
                : null,
            valorNuevo:       { Nombre: datos.Nombre, Celular: datos.Celular, CorreoElectronico: datos.CorreoElectronico, Direccion: datos.Direccion, roles },
            direccionIP:      ip,
            dispositivo:      device,
            resultado:        'EXITOSO',
            descripcion:      `Trabajador editado: ${anterior?.nombre || cedula} (${cedula})`,
        });

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
    const cedula = req.params.cedula;
    const ip     = auditoria.extraerIP(req);
    const device = auditoria.extraerDispositivo(req);

    try {
        await usuarioServicio.cambiarEstado(cedula, activo);

        auditoria.registrarSistema({
            cedulaTrabajador: req.usuario.cedula,
            nombreTrabajador: req.usuario.nombre,
            tipoAccion:       'CAMBIO_ESTADO',
            tablaAfectada:    'trabajador',
            valorAnterior:    { Activo: !activo },
            valorNuevo:       { Activo: activo },
            direccionIP:      ip,
            dispositivo:      device,
            resultado:        'EXITOSO',
            descripcion:      `Trabajador ${cedula} ${activo ? 'activado' : 'eliminado/desactivado'}`,
        });

        res.json({ mensaje: `Trabajador ${activo ? 'activado' : 'desactivado'} correctamente.` });
    } catch (err) {
        console.error('Error al cambiar estado:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
