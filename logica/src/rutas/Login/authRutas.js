const express  = require('express');
const router   = express.Router();
const { login }             = require('../../servicios/Login/authServicio');
const { olvideMiContrasena } = require('../../servicios/Login/recuperacionServicio');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { cedula, contrasena } = req.body;
    if (!cedula || !contrasena) {
        return res.status(400).json({ error: 'La cédula y la contraseña son requeridas.' });
    }
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req) };
        const resultado = await login(String(cedula).trim(), contrasena, auditCtx);
        return res.status(200).json(resultado);
    } catch (err) {
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
        return res.status(200).json(await olvideMiContrasena(correo));
    } catch (err) {
        return res.status(200).json({
            mensaje: err.message || 'Si el correo existe en el sistema, recibirás las instrucciones en breve.'
        });
    }
});

module.exports = router;
