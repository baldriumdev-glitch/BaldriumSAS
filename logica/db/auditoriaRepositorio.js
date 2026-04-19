const pool = require('./db');

/**
 * Extrae la IP real del request (soporta proxy/load balancer).
 */
function extraerIP(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket?.remoteAddress
        || null;
}

/**
 * Extrae el User-Agent recortado a 200 chars.
 */
function extraerDispositivo(req) {
    return (req.headers['user-agent'] || '').substring(0, 200) || null;
}

/**
 * Registra una acción en auditoria_sistema.
 * Fire-and-forget: errores internos solo se loguean, nunca bloquean el flujo principal.
 *
 * @param {object} datos
 * @param {string} datos.cedulaTrabajador
 * @param {string} datos.nombreTrabajador
 * @param {string} datos.tipoAccion          LOGIN | LOGOUT | LOGIN_FALLIDO | CREAR | EDITAR | ELIMINAR | CONSULTAR | CAMBIO_CONTRASENA | CAMBIO_ESTADO
 * @param {string} [datos.tablaAfectada]
 * @param {number} [datos.registroAfectadoID]
 * @param {object} [datos.valorAnterior]
 * @param {object} [datos.valorNuevo]
 * @param {string} [datos.direccionIP]
 * @param {string} [datos.dispositivo]
 * @param {string} [datos.resultado]         EXITOSO | FALLIDO | NO_AUTORIZADO
 * @param {string} [datos.descripcion]
 */
async function registrarSistema({
    cedulaTrabajador,
    nombreTrabajador,
    tipoAccion,
    tablaAfectada    = null,
    registroAfectadoID = null,
    valorAnterior    = null,
    valorNuevo       = null,
    direccionIP      = null,
    dispositivo      = null,
    resultado        = 'EXITOSO',
    descripcion      = null,
}) {
    try {
        await pool.execute(
            `INSERT INTO auditoria_sistema
             (CedulaTrabajador, NombreTrabajador, TipoAccion, TablaAfectada, RegistroAfectadoID,
              ValorAnterior, ValorNuevo, DireccionIP, Dispositivo, Resultado, Descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cedulaTrabajador,
                nombreTrabajador,
                tipoAccion,
                tablaAfectada,
                registroAfectadoID,
                valorAnterior ? JSON.stringify(valorAnterior) : null,
                valorNuevo    ? JSON.stringify(valorNuevo)    : null,
                direccionIP,
                dispositivo,
                resultado,
                descripcion,
            ]
        );
    } catch (err) {
        console.error('[Auditoría Sistema] Error al registrar:', err.message);
    }
}

/**
 * Registra un movimiento de inventario en auditoria_inventario.
 * Fire-and-forget igual que registrarSistema.
 *
 * @param {object} datos
 * @param {number} datos.inventarioID
 * @param {string} datos.nombreProducto
 * @param {string} datos.cedulaResponsable
 * @param {string} datos.nombreResponsable
 * @param {string} datos.tipoMovimiento      ENTRADA | SALIDA
 * @param {number} datos.cantidadAnterior
 * @param {number} datos.cantidadMovimiento
 * @param {number} datos.cantidadPosterior
 * @param {number} datos.valorUnitario
 * @param {string} datos.motivo              COMPRA_CLIENTE | BENEFICIO | INGRESO_PROVEEDOR | DEVOLUCION | AJUSTE_POSITIVO | AJUSTE_NEGATIVO | BAJA | TRANSFERENCIA
 * @param {number} [datos.referenciaID]
 * @param {string} [datos.tablaReferencia]
 * @param {string} [datos.observaciones]
 */
async function registrarInventario({
    inventarioID,
    nombreProducto,
    cedulaResponsable,
    nombreResponsable,
    tipoMovimiento,
    cantidadAnterior,
    cantidadMovimiento,
    cantidadPosterior,
    valorUnitario,
    motivo,
    referenciaID   = null,
    tablaReferencia = null,
    observaciones  = null,
}) {
    try {
        await pool.execute(
            `INSERT INTO auditoria_inventario
             (InventarioID, NombreProducto, CedulaResponsable, NombreResponsable,
              TipoMovimiento, CantidadAnterior, CantidadMovimiento, CantidadPosterior,
              ValorUnitario, Motivo, ReferenciaID, TablaReferencia, Observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                inventarioID, nombreProducto, cedulaResponsable, nombreResponsable,
                tipoMovimiento, cantidadAnterior, cantidadMovimiento, cantidadPosterior,
                valorUnitario, motivo, referenciaID, tablaReferencia, observaciones,
            ]
        );
    } catch (err) {
        console.error('[Auditoría Inventario] Error al registrar:', err.message);
    }
}

/**
 * Retorna los últimos N registros de auditoria_sistema ordenados por fecha desc.
 * @param {number} limite  Máximo de registros (default 400)
 */
async function listarSistema(limite = 400) {
    const lim = parseInt(limite, 10) || 400;
    const [rows] = await pool.query(
        `SELECT ID, CedulaTrabajador, NombreTrabajador, TipoAccion, TablaAfectada,
                ValorAnterior, ValorNuevo, DireccionIP, Dispositivo, Resultado, Descripcion, FechaHora
         FROM auditoria_sistema
         ORDER BY FechaHora DESC
         LIMIT ${lim}`
    );
    return rows;
}

module.exports = { registrarSistema, registrarInventario, listarSistema, extraerIP, extraerDispositivo };
