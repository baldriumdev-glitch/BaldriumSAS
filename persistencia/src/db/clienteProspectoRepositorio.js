const pool = require('./db');

const DIAS_VIGENCIA = 14;

async function _listarPorEstado(estados, dias = DIAS_VIGENCIA) {
    const placeholders = estados.map(() => '?').join(', ');
    const sql = `
        WITH ultimo_estado AS (
            SELECT
                pe.ProspectoID,
                pe.Estado,
                pe.FechaActualizacion,
                ROW_NUMBER() OVER (
                    PARTITION BY pe.ProspectoID
                    ORDER BY pe.FechaActualizacion DESC, pe.ID DESC
                ) AS rn
            FROM prospecto_estado pe
        )
        SELECT
            cp.ID, cp.PersonaID, cp.Nombre, cp.Celular, cp.Direccion,
            ue.Estado, ue.FechaActualizacion
        FROM clienteprospecto cp
        JOIN ultimo_estado ue ON ue.ProspectoID = cp.ID AND ue.rn = 1
        WHERE ue.Estado IN (${placeholders})
          AND ue.FechaActualizacion >= (NOW() - INTERVAL ? DAY)
        ORDER BY ue.FechaActualizacion DESC
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

module.exports = { listarPendientes, listarEnGestion };
