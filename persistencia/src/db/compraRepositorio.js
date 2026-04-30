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

async function crearCompra(cedulaCliente, actor, formaPago, notas, items, referidos = null, auditCtx = {}) {
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

        // Beneficio 4x14: crear prospectos referidos vinculados a esta compra
        if (Array.isArray(referidos) && referidos.length >= 10) {
            for (const ref of referidos) {
                const [rPersona] = await conn.query(
                    `INSERT INTO persona (TipoPersona) VALUES ('Prospecto')`
                );
                const personaId = rPersona.insertId;

                const [rProspecto] = await conn.query(
                    `INSERT INTO clienteprospecto (PersonaID, Nombre, Celular, Direccion)
                     VALUES (?, ?, ?, ?)`,
                    [personaId, ref.nombre || null, ref.celular || null, ref.direccion || null]
                );
                const prospectoId = rProspecto.insertId;

                await conn.query(
                    `INSERT INTO prospecto_estado (ProspectoID, Estado, FechaActualizacion)
                     VALUES (?, 'Pendiente', NOW())`,
                    [prospectoId]
                );

                await conn.query(
                    `INSERT INTO comprareferido (ClienteProspectoID, CompraID) VALUES (?, ?)`,
                    [prospectoId, compraId]
                );

                auditRepo.registrarSistema({
                    cedulaTrabajador:   actor.cedula     ?? null,
                    nombreTrabajador:   actor.nombre     ?? null,
                    tipoAccion:         'CREAR',
                    tablaAfectada:      'clienteprospecto',
                    registroAfectadoID: prospectoId,
                    valorAnterior:      null,
                    valorNuevo:         `Referido: ${ref.nombre} | Celular: ${ref.celular} | Dirección: ${ref.direccion}`,
                    descripcion:        `Prospecto referido creado por Beneficio 4x14 vinculado a CompraID=${compraId}`,
                    direccionIP:        auditCtx.ip      ?? null,
                    dispositivo:        auditCtx.device  ?? null,
                }).catch(err => console.error('[Auditoría Referido]', err.message));
            }
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

const _comprasBase = `
  SELECT
    co.ID, co.FechaCompra, co.TotalCompra, co.EstadoCompra, co.FormaPago,
    c.Nombre AS NombreCliente,
    GROUP_CONCAT(DISTINCT inv.Nombre ORDER BY inv.Nombre SEPARATOR ', ') AS Productos,
    (SELECT b.EstadoBeneficio FROM beneficio b WHERE b.CompraID = co.ID LIMIT 1) AS EstadoBeneficio
  FROM compra co
  JOIN cliente c ON c.Cedula = co.CedulaCliente
  LEFT JOIN compra_inventario ci ON ci.CompraID = co.ID
  LEFT JOIN inventario inv ON inv.ID = ci.InventarioID
`;

async function listarComprasTrabajador(cedulaTrabajador) {
    const [rows] = await pool.query(
        `${_comprasBase} WHERE co.CedulaTrabajador = ? GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [cedulaTrabajador]
    );
    return rows;
}

async function listarComprasTrabajadorSemana(cedulaTrabajador, inicio, fin) {
    const [rows] = await pool.query(
        `${_comprasBase} WHERE co.CedulaTrabajador = ? AND DATE(co.FechaCompra) BETWEEN ? AND ?
         GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [cedulaTrabajador, inicio, fin]
    );
    return rows;
}

async function listarComprasTrabajadorMes(cedulaTrabajador, anio, mes) {
    const [rows] = await pool.query(
        `${_comprasBase} WHERE co.CedulaTrabajador = ?
           AND YEAR(co.FechaCompra) = ? AND MONTH(co.FechaCompra) = ?
         GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [cedulaTrabajador, anio, mes]
    );
    return rows;
}

async function kpiComprasMes(cedulaTrabajador, anio, mes) {
    const [[kpi]] = await pool.query(
        `SELECT
           COUNT(*) AS NumeroVentas,
           COALESCE(SUM(CASE WHEN EstadoCompra = 'Completada' THEN TotalCompra ELSE 0 END), 0) AS ValorVentasConfirmadas
         FROM compra
         WHERE CedulaTrabajador = ?
           AND YEAR(FechaCompra) = ? AND MONTH(FechaCompra) = ?`,
        [cedulaTrabajador, anio, mes]
    );
    return kpi;
}

async function buscarComprasTrabajador(cedulaTrabajador, q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `${_comprasBase}
         WHERE co.CedulaTrabajador = ?
           AND (
             c.Nombre LIKE ?
             OR DATE_FORMAT(co.FechaCompra, '%d/%m/%Y') LIKE ?
             OR co.EstadoCompra LIKE ?
             OR EXISTS (
               SELECT 1 FROM compra_inventario ci2
               JOIN inventario inv2 ON inv2.ID = ci2.InventarioID
               WHERE ci2.CompraID = co.ID AND inv2.Nombre LIKE ?
             )
           )
         GROUP BY co.ID ORDER BY co.FechaCompra DESC`,
        [cedulaTrabajador, like, like, like, like]
    );
    return rows;
}

module.exports = { inventarioCocina, clientePorPersona, crearClienteDesdeProspecto, crearCompra, registrarClienteLibre, listarComprasTrabajador, listarComprasTrabajadorSemana, listarComprasTrabajadorMes, kpiComprasMes, buscarComprasTrabajador };
