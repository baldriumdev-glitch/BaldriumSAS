const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');

// Todas las rutas de este router requieren token válido + rol Auxiliar Administrativo
router.use(verificarToken, verificarRol('Auxiliar Administrativo'));

router.get('/', (_req, res) => {
    res.json({ ok: true, mensaje: 'Aprobar beneficios — en construcción' });
});

module.exports = router;
