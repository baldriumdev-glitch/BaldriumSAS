const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

const _cols = `
  v.ID, v.PersonaID, v.FechaVisita, v.CantidadPersonas, v.Notas,
  v.Estado, v.FechaActualizacion AS UltimaInteraccion,
  p.TipoPersona,
  COALESCE(c.Nombre, cp.Nombre)       AS NombrePersona,
  COALESCE(c.Celular, cp.Celular)     AS Celular,
  COALESCE(c.Direccion, cp.Direccion) AS Direccion
`;

const _joins = `
  JOIN persona p ON v.PersonaID = p.ID
  LEFT JOIN cliente c ON p.ID = c.PersonaID
  LEFT JOIN clienteprospecto cp ON p.ID = cp.PersonaID
`;

async function listarSemana(cedula, fechaInicio, fechaFin) {
    const [rows] = await pool.query(
        `SELECT ${_cols} FROM visita v ${_joins}
         WHERE v.CedulaTrabajador = ? AND DATE(v.FechaVisita) BETWEEN ? AND ?
         ORDER BY
           CASE v.Estado WHEN 'Pendiente' THEN 0 ELSE 1 END,
           CASE WHEN DATE(v.FechaVisita) = CURDATE() THEN 0 ELSE 1 END,
           v.FechaVisita ASC`,
        [cedula, fechaInicio, fechaFin]
    );
    return rows;
}

async function listarMes(cedula, anio, mes) {
    const [rows] = await pool.query(
        `SELECT ${_cols} FROM visita v ${_joins}
         WHERE v.CedulaTrabajador = ?
           AND YEAR(v.FechaVisita) = ? AND MONTH(v.FechaVisita) = ?
         ORDER BY v.FechaVisita ASC`,
        [cedula, anio, mes]
    );
    return rows;
}

async function buscar(cedula, q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
        `SELECT ${_cols} FROM visita v ${_joins}
         WHERE v.CedulaTrabajador = ?
           AND (
             COALESCE(c.Nombre, cp.Nombre) LIKE ?
             OR DATE_FORMAT(v.FechaVisita, '%d/%m/%Y') LIKE ?
             OR v.Estado LIKE ?
           )
         ORDER BY v.FechaVisita DESC`,
        [cedula, like, like, like]
    );
    return rows;
}

async function kpiSemana(cedula, fechaInicio, fechaFin) {
    const [[kpi]] = await pool.query(
        `SELECT
           COALESCE(SUM(v.CantidadPersonas), 0) AS PersonasTotales,
           COUNT(*) AS TotalVisitas,
           SUM(CASE WHEN v.Estado = 'Visitado' THEN 1 ELSE 0 END) AS VisitasConfirmadas,
           SUM(CASE WHEN v.Estado IN ('No contesta', 'Rechaza') THEN 1 ELSE 0 END) AS VisitasNoEfectivas
         FROM visita v
         WHERE v.CedulaTrabajador = ? AND DATE(v.FechaVisita) BETWEEN ? AND ?`,
        [cedula, fechaInicio, fechaFin]
    );
    return kpi;
}

async function detallePersona(personaId) {
    const [[persona]] = await pool.query(
        'SELECT ID, TipoPersona FROM persona WHERE ID = ?', [personaId]
    );
    if (!persona) return null;

    if (persona.TipoPersona === 'Cliente') {
        const [[datos]] = await pool.query(
            `SELECT Cedula, Nombre, Celular, Telefono, CorreoElectronico, Direccion
             FROM cliente WHERE PersonaID = ?`, [personaId]
        );
        return { tipo: 'Cliente', ...datos };
    } else {
        const [[datos]] = await pool.query(
            `SELECT Nombre, Celular, Direccion
             FROM clienteprospecto WHERE PersonaID = ?`, [personaId]
        );
        return { tipo: 'ClienteProspecto', ...datos };
    }
}

async function historialCompras(personaId) {
    const [compras] = await pool.query(
        `SELECT co.ID, co.FechaCompra, co.TotalCompra, co.EstadoCompra,
           GROUP_CONCAT(
             CONCAT(inv.Nombre, ' (x', ci.Cantidad, ' · $', FORMAT(ci.PrecioUnitario, 0), ')')
             ORDER BY inv.Nombre SEPARATOR ' | '
           ) AS Productos
         FROM cliente cli
         JOIN compra co ON co.CedulaCliente = cli.Cedula
         LEFT JOIN compra_inventario ci ON ci.CompraID = co.ID
         LEFT JOIN inventario inv ON inv.ID = ci.InventarioID
         WHERE cli.PersonaID = ?
         GROUP BY co.ID
         ORDER BY co.FechaCompra DESC`,
        [personaId]
    );
    return compras;
}

async function historialVisitas(personaId) {
    const [visitas] = await pool.query(
        `SELECT v.ID, v.FechaVisita, v.CantidadPersonas, v.Notas,
           t.Nombre AS Asesor, v.Estado
         FROM visita v
         LEFT JOIN trabajador t ON t.Cedula = v.CedulaTrabajador
         WHERE v.PersonaID = ?
         ORDER BY
           CASE v.Estado WHEN 'Pendiente' THEN 0 ELSE 1 END,
           v.FechaVisita DESC`,
        [personaId]
    );
    return visitas;
}

const ESTADOS_VALIDOS = ['Pendiente', 'Visitado', 'No contesta', 'Rechaza', 'Re agendada'];

const _colsConTrabajador = `
  v.ID, v.PersonaID, v.FechaVisita, v.CantidadPersonas, v.Notas,
  v.CedulaTrabajador,
  t.Nombre AS NombreTrabajador,
  COALESCE(c.Nombre, cp.Nombre)       AS NombrePersona,
  COALESCE(c.Celular, cp.Celular)     AS Celular,
  COALESCE(c.Direccion, cp.Direccion) AS Direccion,
  v.Estado, v.FechaActualizacion AS UltimaInteraccion
`;

const _joinsConTrabajador = `
  JOIN persona p ON v.PersonaID = p.ID
  LEFT JOIN cliente c ON p.ID = c.PersonaID
  LEFT JOIN clienteprospecto cp ON p.ID = cp.PersonaID
  LEFT JOIN trabajador t ON t.Cedula = v.CedulaTrabajador
`;

// Visitas de la semana ya realizadas (todos los trabajadores)
async function listarSemanaVisitadas(fechaInicio, fechaFin) {
    const [rows] = await pool.query(
        `SELECT ${_colsConTrabajador} FROM visita v ${_joinsConTrabajador}
         WHERE DATE(v.FechaVisita) BETWEEN ? AND ? AND v.Estado = 'Visitado'
         ORDER BY v.FechaVisita ASC`,
        [fechaInicio, fechaFin]
    );
    return rows;
}

// Visitas de la semana por gestionar (todos los trabajadores): No contesta y Re agendada primero, Pendiente después
async function listarSemanaPorGestionar(fechaInicio, fechaFin) {
    const [rows] = await pool.query(
        `SELECT ${_colsConTrabajador} FROM visita v ${_joinsConTrabajador}
         WHERE DATE(v.FechaVisita) BETWEEN ? AND ?
           AND v.Estado IN ('Pendiente', 'No contesta', 'Re agendada')
         ORDER BY
           CASE v.Estado WHEN 'Pendiente' THEN 1 ELSE 0 END,
           v.FechaVisita ASC`,
        [fechaInicio, fechaFin]
    );
    return rows;
}

async function cambiarEstado(visitaId, nuevoEstado, notas = null) {
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) throw new Error('Estado inválido');
    if (!notas || !notas.trim()) throw new Error('Las notas son obligatorias');
    await pool.query(
        'UPDATE visita SET Estado = ?, FechaActualizacion = NOW(), Notas = ? WHERE ID = ?',
        [nuevoEstado, notas.trim(), visitaId]
    );
}

// Estados que Telemercader puede asignar desde la tabla "por gestionar".
// 'Visitado' y 'Rechaza' quedan fuera: esos los define quien realiza la visita.
const ESTADOS_TELEMERCADER = ['Pendiente', 'No contesta', 'Re agendada'];

async function cambiarEstadoTelemercader(visitaId, nuevoEstado, notas, auditCtx = {}) {
    if (!ESTADOS_TELEMERCADER.includes(nuevoEstado)) {
        throw new Error(`Estado inválido. Desde esta tabla solo se permite: ${ESTADOS_TELEMERCADER.join(', ')}.`);
    }
    if (!notas || !notas.trim()) throw new Error('Las notas son obligatorias');

    const [[antes]] = await pool.query('SELECT Estado, Notas FROM visita WHERE ID = ?', [visitaId]);
    if (!antes) throw new Error('Visita no encontrada');

    await pool.query(
        'UPDATE visita SET Estado = ?, FechaActualizacion = NOW(), Notas = ? WHERE ID = ?',
        [nuevoEstado, notas.trim(), visitaId]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'CAMBIO_ESTADO',
        tablaAfectada:      'visita',
        registroAfectadoID: visitaId,
        valorAnterior:      { estado: antes.Estado, notas: antes.Notas },
        valorNuevo:         { estado: nuevoEstado, notas: notas.trim() },
        descripcion:        `Visita #${visitaId} cambió de "${antes.Estado}" a "${nuevoEstado}"`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Cambio Estado Visita]', err.message));
}

const DIAS_VIGENCIA_FALLIDAS = 14;

// Visitas rechazadas o canceladas de las últimas 2 semanas (todos los trabajadores), con notas
async function listarFallidas(dias = DIAS_VIGENCIA_FALLIDAS) {
    const [rows] = await pool.query(
        `SELECT ${_colsConTrabajador} FROM visita v ${_joinsConTrabajador}
         WHERE v.Estado IN ('Rechaza', 'Cancelada')
           AND v.FechaActualizacion >= (NOW() - INTERVAL ? DAY)
         ORDER BY v.FechaActualizacion DESC`,
        [dias]
    );
    return rows;
}

// KPI: total de visitas fallidas (rechazadas + canceladas) de las últimas 2 semanas
async function kpiVisitasFallidas(dias = DIAS_VIGENCIA_FALLIDAS) {
    const [[{ TotalFallidas }]] = await pool.query(
        `SELECT COUNT(*) AS TotalFallidas FROM visita
         WHERE Estado IN ('Rechaza', 'Cancelada')
           AND FechaActualizacion >= (NOW() - INTERVAL ? DAY)`,
        [dias]
    );
    return { TotalFallidas };
}

// Búsqueda sin límite de fecha, dentro del mismo grupo de estados de cada tabla de Telemercader
async function _buscarVisitasPorEstado(estados, q, incluirNotas = false) {
    const placeholders = estados.map(() => '?').join(', ');
    const like = `%${q}%`;
    const params = [...estados, like, like, like];
    let condiciones = `
             COALESCE(c.Nombre, cp.Nombre)          LIKE ?
             OR COALESCE(c.Celular, cp.Celular)     LIKE ?
             OR COALESCE(c.Direccion, cp.Direccion) LIKE ?`;
    if (incluirNotas) {
        condiciones += `\n             OR v.Notas LIKE ?`;
        params.push(like);
    }
    const [rows] = await pool.query(
        `SELECT ${_colsConTrabajador} FROM visita v ${_joinsConTrabajador}
         WHERE v.Estado IN (${placeholders})
           AND (${condiciones})
         ORDER BY v.FechaVisita DESC`,
        params
    );
    return rows;
}

async function buscarVisitadas(q) {
    return _buscarVisitasPorEstado(['Visitado'], q);
}

async function buscarPorGestionar(q) {
    return _buscarVisitasPorEstado(['Pendiente', 'No contesta', 'Re agendada'], q);
}

// Las fallidas también se buscan por notas, ya que ahí queda registrado el motivo del rechazo/cancelación
async function buscarFallidas(q) {
    return _buscarVisitasPorEstado(['Rechaza', 'Cancelada'], q, true);
}

// Detalle completo de una visita para el modal de edición (incluye notas y datos de la persona)
async function obtenerDetalle(visitaId) {
    const [[row]] = await pool.query(
        `SELECT ${_colsConTrabajador}
         FROM visita v ${_joinsConTrabajador}
         WHERE v.ID = ?`,
        [visitaId]
    );
    return row || null;
}

// Edita trabajador/fecha/cantidad/notas de una visita ya agendada (no toca el Estado)
async function editarVisita(visitaId, datos, auditCtx = {}) {
    const { cedulaTrabajador, fechaVisita, cantidadPersonas, notas } = datos;
    if (!cedulaTrabajador) throw new Error('El trabajador asignado es obligatorio');
    if (!fechaVisita) throw new Error('La fecha de la visita es obligatoria');
    if (!cantidadPersonas || Number(cantidadPersonas) < 1) throw new Error('La cantidad de personas es obligatoria');

    const [[antes]] = await pool.query(
        'SELECT CedulaTrabajador, FechaVisita, CantidadPersonas, Notas, Estado FROM visita WHERE ID = ?',
        [visitaId]
    );
    if (!antes) throw new Error('Visita no encontrada');

    const cantidadPersonasNum = Number(cantidadPersonas);
    await pool.query(
        `UPDATE visita SET CedulaTrabajador = ?, FechaVisita = ?, CantidadPersonas = ?, Notas = ? WHERE ID = ?`,
        [cedulaTrabajador, fechaVisita, cantidadPersonasNum, notas || null, visitaId]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'EDITAR',
        tablaAfectada:      'visita',
        registroAfectadoID: visitaId,
        valorAnterior: {
            cedulaTrabajador: antes.CedulaTrabajador,
            fechaVisita:      antes.FechaVisita,
            cantidadPersonas: antes.CantidadPersonas,
            notas:            antes.Notas,
        },
        valorNuevo: {
            cedulaTrabajador,
            fechaVisita,
            cantidadPersonas: cantidadPersonasNum,
            notas: notas || null,
        },
        descripcion:        `Visita #${visitaId} editada (estado actual: ${antes.Estado})`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Editar Visita]', err.message));
}

// Cancela una visita/agenda: no se elimina el registro, pasa a Estado='Cancelada'.
// Deja una foto completa del estado anterior en la auditoría (obligatorio para esta acción).
async function cancelarVisita(visitaId, motivo, auditCtx = {}) {
    if (!motivo || !motivo.trim()) throw new Error('El motivo de la cancelación es obligatorio');

    const [[antes]] = await pool.query(
        `SELECT v.CedulaTrabajador, v.FechaVisita, v.CantidadPersonas, v.Notas, v.Estado,
                t.Nombre AS NombreTrabajador,
                COALESCE(c.Nombre, cp.Nombre) AS NombrePersona
         FROM visita v
         JOIN persona p ON v.PersonaID = p.ID
         LEFT JOIN cliente c ON p.ID = c.PersonaID
         LEFT JOIN clienteprospecto cp ON p.ID = cp.PersonaID
         LEFT JOIN trabajador t ON t.Cedula = v.CedulaTrabajador
         WHERE v.ID = ?`,
        [visitaId]
    );
    if (!antes) throw new Error('Visita no encontrada');
    if (antes.Estado === 'Cancelada') throw new Error('Esta visita ya está cancelada');

    await pool.query(
        `UPDATE visita SET Estado = 'Cancelada', FechaActualizacion = NOW() WHERE ID = ?`,
        [visitaId]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'CAMBIO_ESTADO',
        tablaAfectada:      'visita',
        registroAfectadoID: visitaId,
        valorAnterior: {
            estado:            antes.Estado,
            cliente:           antes.NombrePersona,
            trabajadorAsignado: antes.NombreTrabajador,
            cedulaTrabajador:  antes.CedulaTrabajador,
            fechaVisita:       antes.FechaVisita,
            cantidadPersonas:  antes.CantidadPersonas,
            notas:             antes.Notas,
        },
        valorNuevo: {
            estado: 'Cancelada',
            motivoCancelacion: motivo.trim(),
        },
        descripcion:        `Visita #${visitaId} de ${antes.NombrePersona} cancelada (estaba en "${antes.Estado}"). Motivo: ${motivo.trim()}`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Cancelar Visita]', err.message));
}

async function inventarioAlimentacion() {
    const [rows] = await pool.query(
        `SELECT ID, Nombre, Valor, Cantidad FROM inventario
         WHERE Tipo = 'Alimentacion' AND Activo = 1
         ORDER BY Nombre ASC`
    );
    return rows;
}

async function guardarSuplemento(visitaId, suplementos, actor = {}) {
    if (!suplementos || suplementos.length === 0) return;

    for (const { inventarioId, cantidad } of suplementos) {
        const cant = Number(cantidad) || 1;

        const [[item]] = await pool.query(
            'SELECT Nombre, Valor, Cantidad FROM inventario WHERE ID = ?',
            [inventarioId]
        );
        if (!item) continue;

        const cantidadAnterior  = item.Cantidad;
        const cantidadPosterior = Math.max(0, cantidadAnterior - cant);

        await pool.query(
            'INSERT INTO visita_suplementos (VisitaID, InventarioID) VALUES (?, ?)',
            [visitaId, inventarioId]
        );

        await pool.query(
            'UPDATE inventario SET Cantidad = ? WHERE ID = ?',
            [cantidadPosterior, inventarioId]
        );

        await auditRepo.registrarInventario({
            inventarioID:      inventarioId,
            nombreProducto:    item.Nombre,
            cedulaResponsable: actor.cedula ?? null,
            nombreResponsable: actor.nombre ?? null,
            tipoMovimiento:    'SALIDA',
            cantidadAnterior,
            cantidadMovimiento: cant,
            cantidadPosterior,
            valorUnitario:     item.Valor,
            motivo:            'VISITA',
            referenciaID:      visitaId,
            tablaReferencia:   'visita',
            observaciones:     null,
        });
    }
}

module.exports = {
    listarSemana, listarMes, buscar, kpiSemana, detallePersona, historialCompras, historialVisitas,
    cambiarEstado, inventarioAlimentacion, guardarSuplemento, listarSemanaVisitadas, listarSemanaPorGestionar,
    obtenerDetalle, editarVisita, cancelarVisita, cambiarEstadoTelemercader,
    listarFallidas, kpiVisitasFallidas, buscarVisitadas, buscarPorGestionar, buscarFallidas,
};
