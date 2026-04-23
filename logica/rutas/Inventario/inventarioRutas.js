const express  = require('express');
const router   = express.Router();
const svc      = require('../../servicios/Inventario/inventarioServicio');
const { verificarToken, verificarRol } = require('../../seguridad/jwtMiddleware');
const { auditoria } = require('../../persistenciaCliente');
const { extraerIP, extraerDispositivo } = require('../../utils/requestHelpers');

router.use(verificarToken, verificarRol('Coordinador'));

// GET /api/Inventario
router.get('/', async (_req, res) => {
    try {
        res.json(await svc.listar());
    } catch (err) {
        console.error('Error al listar inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Inventario/auditoria
router.get('/auditoria', async (_req, res) => {
    try {
        res.json(await auditoria.listarInventario(400));
    } catch (err) {
        console.error('Error al listar auditoría de inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/Inventario/auditoria/info
router.get('/auditoria/info', async (_req, res) => {
    try {
        res.json(await auditoria.listarSistemaInventario(400));
    } catch (err) {
        console.error('Error al listar auditoría info inventario:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/Inventario
router.post('/', async (req, res) => {
    const ip     = extraerIP(req);
    const device = extraerDispositivo(req);
    try {
        const nuevo = await svc.crear(req.body);

        auditoria.registrarSistema({
            cedulaTrabajador:  req.usuario.cedula,
            nombreTrabajador:  req.usuario.nombre,
            tipoAccion:        'CREAR',
            tablaAfectada:     'inventario',
            registroAfectadoID: nuevo.ID,
            valorNuevo:        { Nombre: nuevo.Nombre, Tipo: nuevo.Tipo, Valor: nuevo.Valor, Cantidad: nuevo.Cantidad },
            direccionIP:       ip,
            dispositivo:       device,
            resultado:         'EXITOSO',
            descripcion:       `Producto creado: ${nuevo.Nombre} (ID: ${nuevo.ID})`,
        });

        if (nuevo.Cantidad > 0) {
            auditoria.registrarInventario({
                inventarioID:       nuevo.ID,
                nombreProducto:     nuevo.Nombre,
                cedulaResponsable:  req.usuario.cedula,
                nombreResponsable:  req.usuario.nombre,
                tipoMovimiento:     'ENTRADA',
                cantidadAnterior:   0,
                cantidadMovimiento: nuevo.Cantidad,
                cantidadPosterior:  nuevo.Cantidad,
                valorUnitario:      nuevo.Valor,
                motivo:             'AJUSTE_POSITIVO',
                observaciones:      'Creación inicial del producto',
            });
        }

        res.status(201).json({ mensaje: 'Producto creado exitosamente.', producto: nuevo });
    } catch (err) {
        if (err.message.includes('ya está registrado') || err.message.includes('ya existe')) {
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('requeridos') || err.message.includes('inválido') || err.message.includes('negativ')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// PUT /api/Inventario/:id
router.put('/:id', async (req, res) => {
    const id     = parseInt(req.params.id);
    const ip     = extraerIP(req);
    const device = extraerDispositivo(req);
    try {
        const anterior = await svc.actualizar(id, req.body);
        const { Nombre, Tipo, Valor, Cantidad, observaciones } = req.body;

        auditoria.registrarSistema({
            cedulaTrabajador:  req.usuario.cedula,
            nombreTrabajador:  req.usuario.nombre,
            tipoAccion:        'EDITAR',
            tablaAfectada:     'inventario',
            registroAfectadoID: id,
            valorAnterior:     { Nombre: anterior.Nombre, Tipo: anterior.Tipo, Valor: anterior.Valor, Cantidad: anterior.Cantidad },
            valorNuevo:        { Nombre, Tipo, Valor, Cantidad },
            direccionIP:       ip,
            dispositivo:       device,
            resultado:         'EXITOSO',
            descripcion:       `Producto editado: ${anterior.Nombre} (ID: ${id})`,
        });

        const cantAnterior  = anterior.Cantidad;
        const cantNueva     = parseInt(Cantidad);
        const valorAnterior = parseFloat(anterior.Valor);
        const valorNuevo    = parseFloat(Valor);

        const cambios = [];
        if (anterior.Nombre !== Nombre.trim())  cambios.push(`Nombre: "${anterior.Nombre}" → "${Nombre.trim()}"`);
        if (anterior.Tipo   !== Tipo)           cambios.push(`Tipo: "${anterior.Tipo}" → "${Tipo}"`);
        if (valorAnterior   !== valorNuevo)     cambios.push(`Valor: $${valorAnterior} → $${valorNuevo}`);
        if (cantAnterior    !== cantNueva)      cambios.push(`Cantidad: ${cantAnterior} → ${cantNueva}`);

        if (cantAnterior !== cantNueva) {
            const diferencia  = Math.abs(cantNueva - cantAnterior);
            const descCambios = cambios.join(' | ');
            auditoria.registrarInventario({
                inventarioID:       id,
                nombreProducto:     Nombre,
                cedulaResponsable:  req.usuario.cedula,
                nombreResponsable:  req.usuario.nombre,
                tipoMovimiento:     cantNueva > cantAnterior ? 'ENTRADA' : 'SALIDA',
                cantidadAnterior:   cantAnterior,
                cantidadMovimiento: diferencia,
                cantidadPosterior:  cantNueva,
                valorUnitario:      valorNuevo,
                motivo:             cantNueva > cantAnterior ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                observaciones:      [observaciones, descCambios].filter(Boolean).join(' — '),
            });
        }

        res.json({ mensaje: 'Producto actualizado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        if (err.message.includes('requeridos') || err.message.includes('inválido') || err.message.includes('negativ')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// DELETE /api/Inventario/:id
router.delete('/:id', async (req, res) => {
    const id     = parseInt(req.params.id);
    const ip     = extraerIP(req);
    const device = extraerDispositivo(req);
    try {
        const producto = await svc.eliminar(id);

        auditoria.registrarSistema({
            cedulaTrabajador:  req.usuario.cedula,
            nombreTrabajador:  req.usuario.nombre,
            tipoAccion:        'ELIMINAR',
            tablaAfectada:     'inventario',
            registroAfectadoID: id,
            valorAnterior:     { Nombre: producto.Nombre, Tipo: producto.Tipo, Valor: producto.Valor, Cantidad: producto.Cantidad },
            direccionIP:       ip,
            dispositivo:       device,
            resultado:         'EXITOSO',
            descripcion:       `Producto eliminado: ${producto.Nombre} (ID: ${id})`,
        });

        if (producto.Cantidad > 0) {
            auditoria.registrarInventario({
                inventarioID:       id,
                nombreProducto:     producto.Nombre,
                cedulaResponsable:  req.usuario.cedula,
                nombreResponsable:  req.usuario.nombre,
                tipoMovimiento:     'SALIDA',
                cantidadAnterior:   producto.Cantidad,
                cantidadMovimiento: producto.Cantidad,
                cantidadPosterior:  0,
                valorUnitario:      producto.Valor,
                motivo:             'BAJA',
                observaciones:      'Producto eliminado del sistema',
            });
        }

        res.json({ mensaje: 'Producto eliminado correctamente.' });
    } catch (err) {
        if (err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
