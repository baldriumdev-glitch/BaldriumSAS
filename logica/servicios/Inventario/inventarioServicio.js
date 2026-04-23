const cliente = require('../../persistenciaCliente');

const TIPOS_VALIDOS = ['Beneficio', 'Inventario de cocina', 'Alimentacion'];

async function listar() {
    return await cliente.inventario.listarTodos();
}

async function crear(datos) {
    const { Nombre, Tipo, Valor, Cantidad } = datos;
    if (!Nombre || !Tipo || Valor === undefined || Valor === null || Cantidad === undefined) {
        throw new Error('Nombre, tipo, valor y cantidad son requeridos.');
    }
    if (!TIPOS_VALIDOS.includes(Tipo)) {
        throw new Error(`Tipo inválido. Debe ser: ${TIPOS_VALIDOS.join(', ')}.`);
    }
    if (parseInt(Cantidad) < 0) throw new Error('La cantidad no puede ser negativa.');
    if (parseFloat(Valor) < 0)  throw new Error('El valor no puede ser negativo.');
    if (await cliente.inventario.existeNombre(Nombre.trim())) {
        throw new Error(`El producto "${Nombre}" ya está registrado.`);
    }
    const id = await cliente.inventario.crearProducto({ ...datos, Nombre: Nombre.trim() });
    return await cliente.inventario.buscarPorId(id);
}

async function actualizar(id, datos) {
    const { Nombre, Tipo, Valor, Cantidad } = datos;
    if (!Nombre || !Tipo || Valor === undefined || Cantidad === undefined) {
        throw new Error('Nombre, tipo, valor y cantidad son requeridos.');
    }
    if (!TIPOS_VALIDOS.includes(Tipo)) {
        throw new Error(`Tipo inválido. Debe ser: ${TIPOS_VALIDOS.join(', ')}.`);
    }
    if (parseInt(Cantidad) < 0) throw new Error('La cantidad no puede ser negativa.');
    if (parseFloat(Valor) < 0)  throw new Error('El valor no puede ser negativo.');
    const existente = await cliente.inventario.buscarPorId(id);
    if (!existente) throw new Error('Producto no encontrado.');
    if (await cliente.inventario.existeNombre(Nombre.trim(), id)) {
        throw new Error(`Ya existe otro producto con el nombre "${Nombre}".`);
    }
    await cliente.inventario.actualizarProducto(id, { ...datos, Nombre: Nombre.trim() });
    return existente;
}

async function eliminar(id) {
    const existente = await cliente.inventario.buscarPorId(id);
    if (!existente) throw new Error('Producto no encontrado.');
    await cliente.inventario.eliminarProducto(id);
    return existente;
}

async function obtenerUno(id) {
    return await cliente.inventario.buscarPorId(id);
}

module.exports = { listar, crear, actualizar, eliminar, obtenerUno, TIPOS_VALIDOS };
