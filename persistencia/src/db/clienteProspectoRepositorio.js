const pool = require('./db');
const auditRepo = require('./auditoriaRepositorio');

const DIAS_VIGENCIA = 14;

async function _listarPorEstado(estados, dias = DIAS_VIGENCIA) {
    const placeholders = estados.map(() => '?').join(', ');
    const sql = `
        SELECT ID, PersonaID, Nombre, Celular, Direccion, Estado, FechaActualizacion
        FROM clienteprospecto
        WHERE Estado IN (${placeholders})
          AND FechaActualizacion >= (NOW() - INTERVAL ? DAY)
        ORDER BY FechaActualizacion DESC
    `;
    const [rows] = await pool.query(sql, [...estados, dias]);
    return rows;
}

// Cola de gestión: prospectos aún no contactados o que no respondieron, actualizados en las últimas 2 semanas
async function listarPendientes() {
    return _listarPorEstado(['Pendiente', 'No responde']);
}

// Prospectos ya en proceso: contactados o con visita agendada, actualizados en las últimas 2 semanas
async function listarEnGestion() {
    return _listarPorEstado(['Contactado', 'Agendado']);
}

// Búsqueda sin límite de fecha, dentro del mismo grupo de estados de cada tabla
async function _buscarPorEstado(estados, q) {
    const placeholders = estados.map(() => '?').join(', ');
    const like = `%${q}%`;
    const sql = `
        SELECT ID, PersonaID, Nombre, Celular, Direccion, Estado, FechaActualizacion
        FROM clienteprospecto
        WHERE Estado IN (${placeholders})
          AND (Nombre LIKE ? OR Celular LIKE ? OR Direccion LIKE ?)
        ORDER BY FechaActualizacion DESC
    `;
    const [rows] = await pool.query(sql, [...estados, like, like, like]);
    return rows;
}

async function buscarPendientes(q) {
    return _buscarPorEstado(['Pendiente', 'No responde'], q);
}

async function buscarEnGestion(q) {
    return _buscarPorEstado(['Contactado', 'Agendado'], q);
}

// Estados que se pueden asignar manualmente desde las tablas de Telemercader.
// 'Agendado' queda fuera a propósito: solo se llega ahí mediante agendarVisita(),
// que exige dirección y crea la visita asociada.
const ESTADOS_MANUALES = ['Pendiente', 'Contactado', 'No responde'];

async function cambiarEstado(prospectoId, nuevoEstado, auditCtx = {}) {
    if (!ESTADOS_MANUALES.includes(nuevoEstado)) {
        throw new Error(`Estado inválido. Para agendar una visita usa la acción "Agendar visita".`);
    }

    const [[prospecto]] = await pool.query(
        'SELECT ID, Nombre, Estado FROM clienteprospecto WHERE ID = ?',
        [prospectoId]
    );
    if (!prospecto) throw new Error('Prospecto no encontrado');

    await pool.query(
        `UPDATE clienteprospecto SET Estado = ?, FechaActualizacion = NOW() WHERE ID = ?`,
        [nuevoEstado, prospectoId]
    );

    const actor = auditCtx.actor ?? {};
    auditRepo.registrarSistema({
        cedulaTrabajador:   actor.cedula   ?? null,
        nombreTrabajador:   actor.nombre   ?? null,
        tipoAccion:         'EDITAR',
        tablaAfectada:      'clienteprospecto',
        registroAfectadoID: prospectoId,
        valorAnterior:      prospecto.Estado,
        valorNuevo:         nuevoEstado,
        descripcion:        `Prospecto ${prospecto.Nombre} cambió de "${prospecto.Estado}" a "${nuevoEstado}"`,
        direccionIP:        auditCtx.ip     ?? null,
        dispositivo:        auditCtx.device ?? null,
    }).catch(err => console.error('[Auditoría Cambio Estado Prospecto]', err.message));
}

// Agenda una visita para un prospecto: exige nombre/celular/dirección completos,
// pasa el prospecto a estado 'Agendado' y crea la visita asociada (queda en 'Pendiente').
async function agendarVisita(prospectoId, datos, auditCtx = {}) {
    const { nombre, celular, direccion, cedulaTrabajador, fechaVisita, cantidadPersonas, notas } = datos;

    if (!cedulaTrabajador) throw new Error('El trabajador asignado es obligatorio');
    if (!fechaVisita) throw new Error('La fecha de la visita es obligatoria');
    if (!cantidadPersonas || Number(cantidadPersonas) < 1) throw new Error('La cantidad de personas es obligatoria');

    const actor = auditCtx.actor ?? {};
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[prospecto]] = await conn.query(
            'SELECT ID, PersonaID, Nombre, Celular, Direccion FROM clienteprospecto WHERE ID = ? FOR UPDATE',
            [prospectoId]
        );
        if (!prospecto) throw new Error('Prospecto no encontrado');

        const nombreFinal    = (nombre    ?? '').toString().trim() || prospecto.Nombre;
        const celularFinal   = (celular   ?? '').toString().trim() || prospecto.Celular;
        const direccionFinal = (direccion ?? '').toString().trim() || prospecto.Direccion;

        if (!nombreFinal)    throw new Error('El nombre es obligatorio');
        if (!celularFinal)   throw new Error('El celular es obligatorio');
        if (!direccionFinal) throw new Error('La dirección es obligatoria');

        await conn.query(
            `UPDATE clienteprospecto
             SET Nombre = ?, Celular = ?, Direccion = ?, Estado = 'Agendado', FechaActualizacion = NOW()
             WHERE ID = ?`,
            [nombreFinal, celularFinal, direccionFinal, prospectoId]
        );

        const [rVisita] = await conn.query(
            `INSERT INTO visita (PersonaID, CedulaTrabajador, FechaVisita, CantidadPersonas, Notas, Estado, FechaActualizacion)
             VALUES (?, ?, ?, ?, ?, 'Pendiente', NOW())`,
            [prospecto.PersonaID, cedulaTrabajador, fechaVisita, Number(cantidadPersonas), notas || null]
        );
        const visitaId = rVisita.insertId;

        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CREAR',
            tablaAfectada:      'visita',
            registroAfectadoID: visitaId,
            valorAnterior:      null,
            valorNuevo:         `Visita #${visitaId} agendada para ${nombreFinal} (ProspectoID=${prospectoId}), asignada a ${cedulaTrabajador}`,
            descripcion:        `Prospecto ${nombreFinal} pasó a estado Agendado`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Agendar Visita]', err.message));

        return { visitaId, prospectoId, nombre: nombreFinal, celular: celularFinal, direccion: direccionFinal };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

// Crea un prospecto desde cero (no existía) y agenda su visita en el mismo paso:
// exige nombre/celular/dirección + trabajador/fecha/cantidad, igual que agendarVisita,
// pero primero crea la persona y el clienteprospecto.
async function crearProspectoYAgendarVisita(datos, auditCtx = {}) {
    const { nombre, celular, direccion, cedulaTrabajador, fechaVisita, cantidadPersonas, notas } = datos;

    const nombreFinal    = (nombre    ?? '').toString().trim();
    const celularFinal   = (celular   ?? '').toString().trim();
    const direccionFinal = (direccion ?? '').toString().trim();

    if (!nombreFinal)    throw new Error('El nombre es obligatorio');
    if (!celularFinal)   throw new Error('El celular es obligatorio');
    if (!direccionFinal) throw new Error('La dirección es obligatoria');
    if (!cedulaTrabajador) throw new Error('El trabajador asignado es obligatorio');
    if (!fechaVisita) throw new Error('La fecha de la visita es obligatoria');
    if (!cantidadPersonas || Number(cantidadPersonas) < 1) throw new Error('La cantidad de personas es obligatoria');

    const actor = auditCtx.actor ?? {};
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rPersona] = await conn.query(`INSERT INTO persona (TipoPersona) VALUES ('Prospecto')`);
        const personaId = rPersona.insertId;

        const [rProspecto] = await conn.query(
            `INSERT INTO clienteprospecto (PersonaID, Nombre, Celular, Direccion, Estado, FechaActualizacion)
             VALUES (?, ?, ?, ?, 'Agendado', NOW())`,
            [personaId, nombreFinal, celularFinal, direccionFinal]
        );
        const prospectoId = rProspecto.insertId;

        const cantidadPersonasNum = Number(cantidadPersonas);
        const [rVisita] = await conn.query(
            `INSERT INTO visita (PersonaID, CedulaTrabajador, FechaVisita, CantidadPersonas, Notas, Estado, FechaActualizacion)
             VALUES (?, ?, ?, ?, ?, 'Pendiente', NOW())`,
            [personaId, cedulaTrabajador, fechaVisita, cantidadPersonasNum, notas || null]
        );
        const visitaId = rVisita.insertId;

        await conn.commit();

        auditRepo.registrarSistema({
            cedulaTrabajador:   actor.cedula   ?? null,
            nombreTrabajador:   actor.nombre   ?? null,
            tipoAccion:         'CREAR',
            tablaAfectada:      'clienteprospecto',
            registroAfectadoID: prospectoId,
            valorAnterior:      null,
            valorNuevo: {
                nombre: nombreFinal, celular: celularFinal, direccion: direccionFinal,
                visitaId, cedulaTrabajador, fechaVisita, cantidadPersonas: cantidadPersonasNum,
            },
            descripcion:        `Prospecto ${nombreFinal} creado desde cero y agendado (visita #${visitaId})`,
            direccionIP:        auditCtx.ip     ?? null,
            dispositivo:        auditCtx.device ?? null,
        }).catch(err => console.error('[Auditoría Nueva Agenda]', err.message));

        return { prospectoId, personaId, visitaId, nombre: nombreFinal, celular: celularFinal, direccion: direccionFinal };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

module.exports = {
    listarPendientes, listarEnGestion, buscarPendientes, buscarEnGestion,
    agendarVisita, cambiarEstado, crearProspectoYAgendarVisita,
};
