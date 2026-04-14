const express  = require('express');
const router   = express.Router();
const trabajadorServicio = require('../../logica/servicios/trabajadorServicio');
const { verificarToken, verificarRol } = require('../../logica/seguridad/jwtMiddleware');

/**
 * POST /api/trabajador
 * Crea un nuevo trabajador. Solo Dirección o Coordinación pueden hacerlo.
 *
 * Body:
 * {
 *   "Cedula": "1001",
 *   "Contrasena": "claveEnTextoPlano",
 *   "Nombre": "Juan Pérez",
 *   "Celular": "3001234567",
 *   "Telefono": "6011234567",
 *   "CorreoElectronico": "juan@empresa.com",
 *   "Direccion": "Calle 123",
 *   "TipoContrato": "Indefinido",
 *   "roles": [1, 2]
 * }
 */
router.post('/', verificarToken, verificarRol('Dirección', 'Coordinación'), async (req, res) => {
    const { roles, ...datosTrabajador } = req.body;

    try {
        const nuevo = await trabajadorServicio.registrar(datosTrabajador, roles || []);
        return res.status(201).json({
            mensaje: 'Trabajador creado exitosamente.',
            trabajador: nuevo
        });
    } catch (err) {
        if (err.message.includes('Ya existe')) {
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('requeridos')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al crear trabajador:', err);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
