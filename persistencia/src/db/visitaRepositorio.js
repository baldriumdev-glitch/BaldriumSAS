const pool = require('./db');

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
         WHERE v.CedulaTrabajador = ? AND v.FechaVisita BETWEEN ? AND ?
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
         WHERE v.CedulaTrabajador = ? AND v.FechaVisita BETWEEN ? AND ?`,
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
         WHERE v.FechaVisita BETWEEN ? AND ? AND v.Estado = 'Visitado'
         ORDER BY v.FechaVisita ASC`,
        [fechaInicio, fechaFin]
    );
    return rows;
}

// Visitas de la semana por gestionar (todos los trabajadores): No contesta y Re agendada primero, Pendiente después
async function listarSemanaPorGestionar(fechaInicio, fechaFin) {
    const [rows] = await pool.query(
        `SELECT ${_colsConTrabajador} FROM visita v ${_joinsConTrabajador}
         WHERE v.FechaVisita BETWEEN ? AND ?
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
    const auditRepo = require('./auditoriaRepositorio');

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

module.exports = { listarSemana, listarMes, buscar, kpiSemana, detallePersona, historialCompras, historialVisitas, cambiarEstado, inventarioAlimentacion, guardarSuplemento, listarSemanaVisitadas, listarSemanaPorGestionar };
