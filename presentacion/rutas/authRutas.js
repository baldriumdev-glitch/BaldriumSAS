const express  = require('express');
const router   = express.Router();
const authServicio = require('../../logica/servicios/authServicio');

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

module.exports = router;
