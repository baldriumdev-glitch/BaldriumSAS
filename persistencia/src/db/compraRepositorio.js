const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

async function inventarioCocina() {
    const [rows] = await pool.query(
        `SELECT ID, Nombre, Valor, Cantidad FROM inventario
         WHERE Tipo = 'Inventario de cocina' AND Activo = 1 AND Cantidad > 0
         ORDER BY Nombre ASC`
    );
    return rows;
}

async function clientePorPersona(personaId) {
    const [[row]] = await pool.query(
        `SELECT c.Cedula, c.Nombre, c.Celular, c.Telefono, c.CorreoElectronico, c.Direccion
         FROM cliente c WHERE c.PersonaID = ?`,
        [personaId]
    );
    return row || null;
}

async function crearClienteDesdeProspecto(personaId, datos, auditCtx = {}) {
    const { cedula, nombre, celular, telefono, correoElectronico, direccion } = datos;
    const actor = auditCtx.actor ?? {};
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(
            `INSERT INTO cliente (PersonaID, Cedula, Nombre, Celular, Telefono, CorreoElectronico, Direccion)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [personaId, cedula, nombre, celular || null, telefono || null, correoElectronico || null, direccion || null]
        );
        await conn.query(`UPDATE persona SET TipoPersona = 'Cliente' WHERE ID = ?`, [personaId]);
        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CREAR',
            tablaAfectada:      'cliente',
            registroAfectadoID: personaId,
            valorAnterior:      'ClienteProspecto',
            valorNuevo:         `Cliente (cédula: ${cedula})`,
            descripcion:        `Prospecto PersonaID=${personaId} convertido a Cliente con cédula ${cedula}`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Conversión]', err.message));

        return { cedula };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function crearCompra(cedulaCliente, actor, formaPago, notas, items) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let total = 0;
        const enriched = [];
        for (const { inventarioId, cantidad } of items) {
            const [[inv]] = await conn.query(
                'SELECT Nombre, Valor, Cantidad FROM inventario WHERE ID = ?', [inventarioId]
            );
            if (!inv) throw new Error(`Producto ${inventarioId} no encontrado`);
            const cant = Number(cantidad) || 1;
            const precio = Number(inv.Valor);
            total += cant * precio;
            enriched.push({
                inventarioId,
                cantidad: cant,
                precioUnitario: precio,
                nombre: inv.Nombre,
                cantidadAnterior: inv.Cantidad,
            });
        }

        const [result] = await conn.query(
            `INSERT INTO compra (CedulaCliente, CedulaTrabajador, FechaCompra, TotalCompra, FormaPago, EstadoCompra, Notas)
             VALUES (?, ?, NOW(), ?, ?, 'Pendiente', ?)`,
            [cedulaCliente, actor.cedula, total, formaPago, notas || null]
        );
        const compraId = result.insertId;

        for (const { inventarioId, cantidad, precioUnitario, cantidadAnterior } of enriched) {
            await conn.query(
                `INSERT INTO compra_inventario (CompraID, InventarioID, Cantidad, PrecioUnitario)
                 VALUES (?, ?, ?, ?)`,
                [compraId, inventarioId, cantidad, precioUnitario]
            );
            const cantidadPosterior = Math.max(0, cantidadAnterior - cantidad);
            await conn.query(
                'UPDATE inventario SET Cantidad = ? WHERE ID = ?',
                [cantidadPosterior, inventarioId]
            );
        }

        await conn.commit();

        // Auditoría (no-blocking, falla silenciosamente si el ENUM no tiene 'VENTA')
        for (const { inventarioId, cantidad, precioUnitario, nombre, cantidadAnterior } of enriched) {
            const cantidadPosterior = Math.max(0, cantidadAnterior - cantidad);
            auditRepo.registrarInventario({
                inventarioID:       inventarioId,
                nombreProducto:     nombre,
                cedulaResponsable:  actor.cedula ?? null,
                nombreResponsable:  actor.nombre ?? null,
                tipoMovimiento:     'SALIDA',
                cantidadAnterior,
                cantidadMovimiento: cantidad,
                cantidadPosterior,
                valorUnitario:      precioUnitario,
                motivo:             'VENTA',
                referenciaID:       compraId,
                tablaReferencia:    'compra',
                observaciones:      null,
            }).catch(err => console.error('[Auditoría Compra]', err.message));
        }

        return { compraId };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function registrarClienteLibre(datos, auditCtx = {}) {
    const { cedula, nombre, celular, telefono, correoElectronico, direccion } = datos;
    if (!cedula) throw new Error('La cédula es obligatoria');

    // Si la cédula ya existe en cliente, reutilizarla
    const [[existente]] = await pool.query('SELECT Cedula FROM cliente WHERE Cedula = ?', [cedula]);
    if (existente) return { cedula, yaExistia: true };

    const actor = auditCtx.actor ?? {};
    const conn  = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [r] = await conn.query(`INSERT INTO persona (TipoPersona) VALUES ('Cliente')`);
        const personaId = r.insertId;
        await conn.query(
            `INSERT INTO cliente (PersonaID, Cedula, Nombre, Celular, Telefono, CorreoElectronico, Direccion)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [personaId, cedula, nombre || null, celular || null, telefono || null, correoElectronico || null, direccion || null]
        );
        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CREAR',
            tablaAfectada:      'cliente',
            registroAfectadoID: personaId,
            valorAnterior:      null,
            valorNuevo:         `Cliente libre (cédula: ${cedula})`,
            descripcion:        `Cliente creado desde venta libre con cédula ${cedula}`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Cliente Libre]', err.message));

        return { cedula, yaExistia: false };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = { inventarioCocina, clientePorPersona, crearClienteDesdeProspecto, crearCompra, registrarClienteLibre };
