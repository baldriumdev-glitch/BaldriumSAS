const express  = require('express');
const router   = express.Router();
const perfilServicio = require('../../servicios/Usuario/perfilServicio');
const { verificarToken } = require('../../seguridad/jwtMiddleware');
const { auditoria } = require('../../persistenciaCliente');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

router.use(verificarToken);

// GET /api/perfil
router.get('/', async (req, res) => {
    try {
        res.json(await perfilServicio.obtenerPerfil(req.usuario.cedula));
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// PUT /api/perfil
router.put('/', async (req, res) => {
    const cedula = req.usuario.cedula;
    const ip     = extraerIP(req);
    const device = extraerDispositivo(req);

    try {
        const anterior = await perfilServicio.obtenerPerfil(cedula);

        await perfilServicio.actualizarPerfil(cedula, req.body);

        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: req.usuario.nombre,
            tipoAccion:    'EDITAR',
            tablaAfectada: 'trabajador',
            valorAnterior: { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion },
            valorNuevo:    { Nombre: req.body.Nombre, Celular: req.body.Celular, CorreoElectronico: req.body.CorreoElectronico, Direccion: req.body.Direccion },
            direccionIP:   ip,
            dispositivo:   device,
            resultado:     'EXITOSO',
            descripcion:   `Trabajador actualizó su perfil: ${anterior.nombre} (${cedula})`,
        });

        res.json({ mensaje: 'Perfil actualizado correctamente.' });
    } catch (err) {
        if (err.message.includes('requeridos')) return res.status(400).json({ error: err.message });
        console.error('Error al actualizar perfil:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PATCH /api/perfil/contrasena
router.patch('/contrasena', async (req, res) => {
    const cedula = req.usuario.cedula;
    const { contrasenaActual, nuevaContrasena } = req.body;
    const ip     = extraerIP(req);
    const device = extraerDispositivo(req);

    try {
        await perfilServicio.cambiarContrasena(cedula, contrasenaActual, nuevaContrasena);

        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: req.usuario.nombre,
            tipoAccion:    'CAMBIO_CONTRASENA',
            tablaAfectada: 'trabajador',
            direccionIP:   ip,
            dispositivo:   device,
            resultado:     'EXITOSO',
            descripcion:   `Cambio de contraseña exitoso: ${req.usuario.nombre} (${cedula})`,
        });

        res.json({ mensaje: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        if (err.message.includes('incorrecta') || err.message.includes('requeridas')) {
            auditoria.registrarSistema({
                cedulaTrabajador: cedula,
                nombreTrabajador: req.usuario.nombre,
                tipoAccion:    'CAMBIO_CONTRASENA',
                tablaAfectada: 'trabajador',
                direccionIP:   ip,
                dispositivo:   device,
                resultado:     'FALLIDO',
                descripcion:   `Intento fallido de cambio de contraseña: ${err.message}`,
            });
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al cambiar contraseña:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
