const express = require('express');
const router  = express.Router();
const authServicio = require('../servicios/Login/authServicio');
const { olvideMiContrasena } = require('../servicios/Login/recuperacionServicio');
const auditoria = require('../db/auditoriaRepositorio');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { cedula, contrasena } = req.body;
    const ip      = auditoria.extraerIP(req);
    const device  = auditoria.extraerDispositivo(req);

    if (!cedula || !contrasena) {
        return res.status(400).json({ error: 'La cédula y la contraseña son requeridas.' });
    }

    try {
        const resultado = await authServicio.login(String(cedula).trim(), contrasena);

        // Auditoría: LOGIN exitoso (fire-and-forget)
        auditoria.registrarSistema({
            cedulaTrabajador: resultado.usuario.cedula,
            nombreTrabajador: resultado.usuario.nombre,
            tipoAccion:       'LOGIN',
            direccionIP:      ip,
            dispositivo:      device,
            resultado:        'EXITOSO',
            descripcion:      'Inicio de sesión exitoso',
        });

        return res.status(200).json(resultado);
    } catch (err) {
        // Auditoría: LOGIN_FALLIDO (fire-and-forget)
        auditoria.registrarSistema({
            cedulaTrabajador: String(cedula).trim(),
            nombreTrabajador: 'No identificado',
            tipoAccion:       'LOGIN_FALLIDO',
            direccionIP:      ip,
            dispositivo:      device,
            resultado:        'FALLIDO',
            descripcion:      err.message || 'Credenciales inválidas',
        });

        return res.status(401).json({ error: err.message || 'Credenciales inválidas' });
    }
});

// POST /api/auth/olvide-contrasena
router.post('/olvide-contrasena', async (req, res) => {
    const { correo } = req.body;

    if (!correo || !correo.includes('@')) {
        return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
    }

    try {
        const resultado = await olvideMiContrasena(correo);
        return res.status(200).json(resultado);
    } catch (err) {
        return res.status(200).json({
            mensaje: err.message || 'Si el correo existe en el sistema, recibirás las instrucciones en breve.'
        });
    }
});

module.exports = router;
