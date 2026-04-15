const pool = require('./db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Busca un trabajador por cédula e incluye todos sus roles.
 * @param {string} cedula
 */
async function buscarPorCedula(cedula) {
    const sql = `
        SELECT
            t.Cedula,
            t.Contrasena,
            t.Nombre,
            t.Celular,
            t.Telefono,
            t.CorreoElectronico,
            t.Direccion,
            t.TipoContrato,
            r.ID        AS rolId,
            r.TipoRol   AS tipoRol
        FROM trabajador t
        LEFT JOIN rol_trabajador rt ON t.Cedula = rt.CedulaTrabajador
        LEFT JOIN rol r             ON rt.RolID  = r.ID
        WHERE t.Cedula = ?
    `;

    const [rows] = await pool.execute(sql, [cedula]);
    if (!rows || rows.length === 0) return null;

    const { Cedula, Contrasena, Nombre, Celular, Telefono,
            CorreoElectronico, Direccion, TipoContrato } = rows[0];

    const roles = rows
        .filter(row => row.tipoRol !== null)
        .map(row => row.tipoRol);

    return {
        trabajador: { Cedula, Contrasena, Nombre, Celular, Telefono,
                      CorreoElectronico, Direccion, TipoContrato },
        roles
    };
}

/**
 * Crea un nuevo trabajador con la contraseña hasheada con bcrypt.
 * @param {Object} datos
 * @param {number[]} rolesIds  Array de IDs de rol: [1,2,...]
 */
async function crearTrabajador(datos, rolesIds = []) {
    const { Cedula, Contrasena, Nombre, Celular, Telefono,
            CorreoElectronico, Direccion, TipoContrato } = datos;

    // Hashear contraseña ANTES de guardar
    const hash = await bcrypt.hash(Contrasena, SALT_ROUNDS);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Insertar trabajador
        await conn.execute(
            `INSERT INTO trabajador
                (Cedula, Contrasena, Nombre, Celular, Telefono, CorreoElectronico, Direccion, TipoContrato)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [Cedula, hash, Nombre, Celular, Telefono, CorreoElectronico, Direccion, TipoContrato]
        );

        // Asignar roles si se enviaron
        for (const rolId of rolesIds) {
            await conn.execute(
                'INSERT INTO rol_trabajador (CedulaTrabajador, RolID) VALUES (?, ?)',
                [Cedula, rolId]
            );
        }

        await conn.commit();
        return { Cedula, Nombre, roles: rolesIds };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Verifica si una cédula ya existe en la BD.
 */
async function existeCedula(cedula) {
    const [rows] = await pool.execute(
        'SELECT Cedula FROM trabajador WHERE Cedula = ?', [cedula]
    );
    return rows.length > 0;
}

module.exports = { buscarPorCedula, crearTrabajador, existeCedula };
