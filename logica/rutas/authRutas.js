const express = require('express');
const router = express.Router();
const authServicio = require('../servicios/Login/authServicio');
const { olvideMiContrasena } = require('../servicios/Login/recuperacionServicio');

/**
 * POST /api/auth/login
 * Body: { cedula, contrasena }
 * Respuesta: { token, usuario }
 */
router.post('/login', async (req, res) => {
    const { cedula, contrasena } = req.body;

    // Validación básica de campos
    if (!cedula || !contrasena) {
        return res.status(400).json({ error: 'La cédula y la contraseña son requeridas.' });
    }

    try {
        const resultado = await authServicio.login(String(cedula).trim(), contrasena);
        return res.status(200).json(resultado);
    } catch (err) {
        // Nunca revelar si la cédula existe o no
        return res.status(401).json({ error: err.message || 'Credenciales inválidas' });
    }
});

/**
 * POST /api/auth/olvide-contrasena
 * Body: { correo }
 * Respuesta: { mensaje }
 * Genera una contraseña temporal, la guarda en BD y la envía al correo registrado.
 */
router.post('/olvide-contrasena', async (req, res) => {
    const { correo } = req.body;

    if (!correo || !correo.includes('@')) {
        return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
    }

    try {
        const resultado = await olvideMiContrasena(correo);
        return res.status(200).json(resultado);
    } catch (err) {
        // Respuesta genérica: no revelar si el correo existe o no
        return res.status(200).json({
            mensaje: err.message || 'Si el correo existe en el sistema, recibirás las instrucciones en breve.'
        });
    }
});

module.exports = router;
