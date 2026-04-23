const pool = require('./db');

async function listarTodos() {
    const [rows] = await pool.execute(
        `SELECT ID, Nombre, Tipo, Valor, Cantidad, FechaActualizacion
         FROM inventario WHERE Activo = 1 ORDER BY Tipo, Nombre`
    );
    return rows;
}

async function buscarPorId(id) {
    const [rows] = await pool.execute(
        'SELECT ID, Nombre, Tipo, Valor, Cantidad, FechaActualizacion FROM inventario WHERE ID = ?',
        [id]
    );
    return rows[0] || null;
}

async function crearProducto(datos) {
    const { Nombre, Tipo, Valor, Cantidad } = datos;
    const [result] = await pool.execute(
        'INSERT INTO inventario (Nombre, Tipo, Valor, Cantidad) VALUES (?, ?, ?, ?)',
        [Nombre, Tipo, parseFloat(Valor), parseInt(Cantidad)]
    );
    return result.insertId;
}

async function actualizarProducto(id, datos) {
    const { Nombre, Tipo, Valor, Cantidad } = datos;
    await pool.execute(
        `UPDATE inventario SET Nombre=?, Tipo=?, Valor=?, Cantidad=?, FechaActualizacion=NOW() WHERE ID=?`,
        [Nombre, Tipo, parseFloat(Valor), parseInt(Cantidad), id]
    );
}

async function eliminarProducto(id) {
    await pool.execute(
        'UPDATE inventario SET Activo = 0, FechaActualizacion = NOW() WHERE ID = ?',
        [id]
    );
}

async function existeNombre(nombre, excluirId = null) {
    const sql = excluirId
        ? 'SELECT ID FROM inventario WHERE Nombre = ? AND ID != ?'
        : 'SELECT ID FROM inventario WHERE Nombre = ?';
    const params = excluirId ? [nombre, excluirId] : [nombre];
    const [rows] = await pool.execute(sql, params);
    return rows.length > 0;
}

module.exports = { listarTodos, buscarPorId, crearProducto, actualizarProducto, eliminarProducto, existeNombre };
