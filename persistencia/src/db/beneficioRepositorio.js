const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

// ─── Parámetros (Director) ─────────────────────────────────────────────────

async function obtenerParametros() {
    const [[row]] = await pool.query(
        'SELECT ValorMinimoCompra, MinimoReferidosVisitados, FechaActualizacion FROM parametro_beneficio WHERE ID = 1'
    );
    return row;
}

async function actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, auditCtx = {}) {
    if (valorMinimoCompra === undefined || valorMinimoCompra === null || Number(valorMinimoCompra) < 0) {
        throw new Error('El valor mínimo de compra es obligatorio y debe ser un número positivo');
    }
    if (minimoReferidosVisitados === undefined || minimoReferidosVisitados === null || Number(minimoReferidosVisitados) < 0) {
        throw new Error('El mínimo de referidos visitados es obligatorio y debe ser un número positivo');
    }

    const antes = await obtenerParametros();
    const valorMinimoCompraNum = Number(valorMinimoCompra);
    const minimoReferidosVisitadosNum = Number(minimoReferidosVisitados);

    await pool.query(
        'UPDATE parametro_beneficio SET ValorMinimoCompra = ?, MinimoReferidosVisitados = ?, FechaActualizacion = NOW() WHERE ID = 1',
        [valorMinimoCompraNum, minimoReferidosVisitadosNum]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'EDITAR',
        tablaAfectada:      'parametro_beneficio',
        registroAfectadoID: 1,
        valorAnterior:      antes,
        valorNuevo:         { ValorMinimoCompra: valorMinimoCompraNum, MinimoReferidosVisitados: minimoReferidosVisitadosNum },
        descripcion:        'Parámetros del beneficio 4x14 actualizados',
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Parámetros Beneficio]', err.message));

    return { ValorMinimoCompra: valorMinimoCompraNum, MinimoReferidosVisitados: minimoReferidosVisitadosNum };
}

// ─── Compras elegibles (Telemercader) ──────────────────────────────────────

const DIAS_VIGENCIA_BENEFICIO = 15;

// Compras candidatas a un beneficio: dentro de los últimos 15 días desde que se
// crearon, y sin ningún beneficio ya creado (en cualquier estado — Revision,
// Aceptado o Rechazado ya cuentan como "resueltas" y dejan de mostrarse aquí).
const _comprasElegiblesSql = `
    SELECT
        co.ID, co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra,
        co.FechaCompra, co.EstadoCompra,
        COUNT(DISTINCT CASE WHEN v.Estado = 'Visitado' THEN cp.ID END) AS ReferidosVisitados,
        COUNT(DISTINCT cp.ID) AS TotalReferidos
    FROM compra co
    JOIN cliente cli ON cli.Cedula = co.CedulaCliente
    JOIN comprareferido cr ON cr.CompraID = co.ID
    JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
    LEFT JOIN visita v ON v.PersonaID = cp.PersonaID
    WHERE co.TotalCompra >= ?
      AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
      AND NOT EXISTS (SELECT 1 FROM beneficio b WHERE b.CompraID = co.ID)
    GROUP BY co.ID
    HAVING ReferidosVisitados >= ?
    ORDER BY co.FechaCompra DESC
`;

async function listarComprasElegibles() {
    const params = await obtenerParametros();
    const [rows] = await pool.query(
        _comprasElegiblesSql,
        [params.ValorMinimoCompra, DIAS_VIGENCIA_BENEFICIO, params.MinimoReferidosVisitados]
    );
    return rows;
}

// Recalcula la elegibilidad de UNA compra puntual contra los parámetros actuales (para validar al crear)
async function _compraSigueCalificando(compraId) {
    const params = await obtenerParametros();
    const [[compra]] = await pool.query(
        `SELECT co.ID, co.TotalCompra, co.FechaCompra,
           COUNT(DISTINCT CASE WHEN v.Estado = 'Visitado' THEN cp.ID END) AS ReferidosVisitados
         FROM compra co
         LEFT JOIN comprareferido cr ON cr.CompraID = co.ID
         LEFT JOIN clienteprospecto cp ON cp.ID = cr.ClienteProspectoID
         LEFT JOIN visita v ON v.PersonaID = cp.PersonaID
         WHERE co.ID = ?
         GROUP BY co.ID`,
        [compraId]
    );
    if (!compra) throw new Error('Compra no encontrada');

    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_VIGENCIA_BENEFICIO);
    if (new Date(compra.FechaCompra) < limite) {
        throw new Error(`Esta compra ya superó el plazo máximo de ${DIAS_VIGENCIA_BENEFICIO} días para aplicar al beneficio`);
    }

    if (Number(compra.TotalCompra) < Number(params.ValorMinimoCompra) || compra.ReferidosVisitados < params.MinimoReferidosVisitados) {
        throw new Error('Esta compra no cumple (o dejó de cumplir) los parámetros actuales del beneficio');
    }
    return compra;
}

// Crea el beneficio para una compra elegible: NO elige producto todavía —
// eso lo decide Auxiliar Administrativo al aprobar. Queda en 'Revision'.
async function crearBeneficio(compraId, auditCtx = {}) {
    if (!compraId) throw new Error('La compra es obligatoria');

    await _compraSigueCalificando(compraId);

    const [[existente]] = await pool.query(
        `SELECT ID FROM beneficio WHERE CompraID = ? LIMIT 1`,
        [compraId]
    );
    if (existente) throw new Error('Esta compra ya tiene un beneficio creado');

    const [result] = await pool.query(
        `INSERT INTO beneficio (CompraID, InventarioID, EstadoBeneficio) VALUES (?, NULL, 'Revision')`,
        [compraId]
    );
    const beneficioId = result.insertId;

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'CREAR',
        tablaAfectada:      'beneficio',
        registroAfectadoID: beneficioId,
        valorAnterior:      null,
        valorNuevo:         { compraId, estado: 'Revision' },
        descripcion:        `Beneficio creado para la compra #${compraId}; queda en Revisión (Auxiliar Administrativo elige el producto al aprobar)`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Crear Beneficio]', err.message));

    return { beneficioId, compraId, estado: 'Revision' };
}

// ─── Revisión (Auxiliar Administrativo) ────────────────────────────────────

async function listarEnRevision() {
    const [rows] = await pool.query(
        `SELECT b.ID, b.CompraID, b.InventarioID, b.EstadoBeneficio,
           co.CedulaCliente, cli.Nombre AS NombreCliente, co.TotalCompra, co.FechaCompra,
           inv.Nombre AS NombreProducto
         FROM beneficio b
         JOIN compra co ON co.ID = b.CompraID
         JOIN cliente cli ON cli.Cedula = co.CedulaCliente
         LEFT JOIN inventario inv ON inv.ID = b.InventarioID
         WHERE b.EstadoBeneficio = 'Revision'
           AND co.FechaCompra >= (CURDATE() - INTERVAL ? DAY)
         ORDER BY b.ID DESC`,
        [DIAS_VIGENCIA_BENEFICIO]
    );
    return rows;
}

// Productos que Auxiliar Administrativo puede otorgar como beneficio:
// solo inventario de Tipo = 'Beneficio', activo y con existencias.
async function listarProductosDisponibles() {
    const [rows] = await pool.query(
        `SELECT ID, Nombre, Valor, Cantidad
         FROM inventario
         WHERE Tipo = 'Beneficio' AND Activo = 1 AND Cantidad > 0
         ORDER BY Nombre ASC`
    );
    return rows;
}

const ESTADOS_REVISION = ['Aceptado', 'Rechazado'];

// Aceptar exige inventarioId (debe ser Tipo='Beneficio', activo y con stock) y descuenta
// una unidad del inventario, dejando registro en auditoria_inventario. Rechazar no toca inventario.
async function cambiarEstadoBeneficio(beneficioId, nuevoEstado, inventarioId, auditCtx = {}) {
    if (!ESTADOS_REVISION.includes(nuevoEstado)) {
        throw new Error(`Estado inválido. Desde revisión solo se permite: ${ESTADOS_REVISION.join(', ')}.`);
    }

    const [[antes]] = await pool.query('SELECT EstadoBeneficio, CompraID FROM beneficio WHERE ID = ?', [beneficioId]);
    if (!antes) throw new Error('Beneficio no encontrado');
    if (antes.EstadoBeneficio !== 'Revision') {
        throw new Error(`Este beneficio ya está en estado "${antes.EstadoBeneficio}", no está en revisión`);
    }

    const actor = auditCtx.actor ?? {};

    if (nuevoEstado === 'Rechazado') {
        await pool.query('UPDATE beneficio SET EstadoBeneficio = ? WHERE ID = ?', [nuevoEstado, beneficioId]);

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CAMBIO_ESTADO',
            tablaAfectada:      'beneficio',
            registroAfectadoID: beneficioId,
            valorAnterior:      { estado: antes.EstadoBeneficio },
            valorNuevo:         { estado: nuevoEstado },
            descripcion:        `Beneficio #${beneficioId} (compra #${antes.CompraID}) pasó a "${nuevoEstado}"`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Estado Beneficio]', err.message));
        return;
    }

    // Aceptado: exige producto de Tipo='Beneficio' con stock, lo descuenta y deja el registro.
    if (!inventarioId) throw new Error('Debes elegir el producto que se otorga como beneficio');

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[producto]] = await conn.query(
            `SELECT ID, Nombre, Tipo, Cantidad, Valor FROM inventario WHERE ID = ? FOR UPDATE`,
            [inventarioId]
        );
        if (!producto) throw new Error('Producto no encontrado');
        if (producto.Tipo !== 'Beneficio') throw new Error('Solo se puede otorgar inventario de tipo "Beneficio"');
        if (producto.Cantidad <= 0) throw new Error(`"${producto.Nombre}" no tiene existencias disponibles`);

        const cantidadAnterior  = producto.Cantidad;
        const cantidadPosterior = cantidadAnterior - 1;

        await conn.query('UPDATE inventario SET Cantidad = ? WHERE ID = ?', [cantidadPosterior, inventarioId]);
        await conn.query(
            'UPDATE beneficio SET EstadoBeneficio = ?, InventarioID = ? WHERE ID = ?',
            [nuevoEstado, inventarioId, beneficioId]
        );

        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CAMBIO_ESTADO',
            tablaAfectada:      'beneficio',
            registroAfectadoID: beneficioId,
            valorAnterior:      { estado: antes.EstadoBeneficio },
            valorNuevo:         { estado: nuevoEstado, inventarioId, producto: producto.Nombre },
            descripcion:        `Beneficio #${beneficioId} (compra #${antes.CompraID}) pasó a "${nuevoEstado}"; se otorgó "${producto.Nombre}"`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Estado Beneficio]', err.message));

        auditRepo.registrarInventario({
            inventarioID:       inventarioId,
            nombreProducto:     producto.Nombre,
            cedulaResponsable:  actor.cedula ?? null,
            nombreResponsable:  actor.nombre ?? null,
            tipoMovimiento:     'SALIDA',
            cantidadAnterior,
            cantidadMovimiento: 1,
            cantidadPosterior,
            valorUnitario:      producto.Valor,
            motivo:             'BENEFICIO',
            referenciaID:       beneficioId,
            tablaReferencia:    'beneficio',
            observaciones:      `Beneficio otorgado por la compra #${antes.CompraID}`,
        }).catch(err => console.error('[Auditoría Inventario Beneficio]', err.message));
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = {
    obtenerParametros, actualizarParametros, listarComprasElegibles,
    crearBeneficio, listarEnRevision, listarProductosDisponibles, cambiarEstadoBeneficio,
};
