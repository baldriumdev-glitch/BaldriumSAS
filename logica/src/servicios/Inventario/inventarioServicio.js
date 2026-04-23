const { inventario, auditoria } = require('../../infraestructura/persistenciaCliente');

const TIPOS_VALIDOS = ['Beneficio', 'Inventario de cocina', 'Alimentacion'];

async function listar() {
    return await inventario.listarTodos();
}

async function listarAuditoriaMovimientos(limite = 400) {
    return await auditoria.listarInventario(limite);
}

async function listarAuditoriaInfo(limite = 400) {
    return await auditoria.listarSistemaInventario(limite);
}

function _validar({ Nombre, Tipo, Valor, Cantidad }) {
    if (!Nombre || !Tipo || Valor === undefined || Valor === null || Cantidad === undefined) {
        throw new Error('Nombre, tipo, valor y cantidad son requeridos.');
    }
    if (!TIPOS_VALIDOS.includes(Tipo)) {
        throw new Error(`Tipo inválido. Debe ser: ${TIPOS_VALIDOS.join(', ')}.`);
    }
    if (parseInt(Cantidad) < 0) throw new Error('La cantidad no puede ser negativa.');
    if (parseFloat(Valor) < 0)  throw new Error('El valor no puede ser negativo.');
}

async function crear(datos, auditCtx = {}) {
    _validar(datos);
    const nombre = datos.Nombre.trim();

    if (await inventario.existeNombre(nombre)) {
        throw new Error(`El producto "${nombre}" ya está registrado.`);
    }

    const id   = await inventario.crearProducto({ ...datos, Nombre: nombre });
    const nuevo = await inventario.buscarPorId(id);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CREAR', tablaAfectada: 'inventario',
        registroAfectadoID: nuevo.ID,
        valorNuevo: { Nombre: nuevo.Nombre, Tipo: nuevo.Tipo, Valor: nuevo.Valor, Cantidad: nuevo.Cantidad },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Producto creado: ${nuevo.Nombre} (ID: ${nuevo.ID})`,
    });

    if (nuevo.Cantidad > 0) {
        auditoria.registrarInventario({
            inventarioID: nuevo.ID, nombreProducto: nuevo.Nombre,
            cedulaResponsable: auditCtx.actor?.cedula, nombreResponsable: auditCtx.actor?.nombre,
            tipoMovimiento: 'ENTRADA',
            cantidadAnterior: 0, cantidadMovimiento: nuevo.Cantidad, cantidadPosterior: nuevo.Cantidad,
            valorUnitario: nuevo.Valor, motivo: 'AJUSTE_POSITIVO',
            observaciones: 'Creación inicial del producto',
        });
    }

    return nuevo;
}

async function actualizar(id, datos, auditCtx = {}) {
    _validar(datos);
    const nombre = datos.Nombre.trim();

    const anterior = await inventario.buscarPorId(id);
    if (!anterior) throw new Error('Producto no encontrado.');

    if (await inventario.existeNombre(nombre, id)) {
        throw new Error(`Ya existe otro producto con el nombre "${nombre}".`);
    }

    await inventario.actualizarProducto(id, { ...datos, Nombre: nombre });

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'EDITAR', tablaAfectada: 'inventario',
        registroAfectadoID: id,
        valorAnterior: { Nombre: anterior.Nombre, Tipo: anterior.Tipo, Valor: anterior.Valor, Cantidad: anterior.Cantidad },
        valorNuevo:    { Nombre: nombre, Tipo: datos.Tipo, Valor: datos.Valor, Cantidad: datos.Cantidad },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Producto editado: ${anterior.Nombre} (ID: ${id})`,
    });

    const cantAnterior = anterior.Cantidad;
    const cantNueva    = parseInt(datos.Cantidad);

    if (cantAnterior !== cantNueva) {
        const cambios = [];
        if (anterior.Nombre !== nombre)                               cambios.push(`Nombre: "${anterior.Nombre}" → "${nombre}"`);
        if (anterior.Tipo   !== datos.Tipo)                           cambios.push(`Tipo: "${anterior.Tipo}" → "${datos.Tipo}"`);
        if (parseFloat(anterior.Valor) !== parseFloat(datos.Valor))   cambios.push(`Valor: $${anterior.Valor} → $${datos.Valor}`);
        cambios.push(`Cantidad: ${cantAnterior} → ${cantNueva}`);

        auditoria.registrarInventario({
            inventarioID: id, nombreProducto: nombre,
            cedulaResponsable: auditCtx.actor?.cedula, nombreResponsable: auditCtx.actor?.nombre,
            tipoMovimiento:     cantNueva > cantAnterior ? 'ENTRADA' : 'SALIDA',
            cantidadAnterior:   cantAnterior,
            cantidadMovimiento: Math.abs(cantNueva - cantAnterior),
            cantidadPosterior:  cantNueva,
            valorUnitario: parseFloat(datos.Valor),
            motivo: cantNueva > cantAnterior ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
            observaciones: [datos.observaciones, cambios.join(' | ')].filter(Boolean).join(' — '),
        });
    }
}

async function eliminar(id, auditCtx = {}) {
    const existente = await inventario.buscarPorId(id);
    if (!existente) throw new Error('Producto no encontrado.');

    await inventario.eliminarProducto(id);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'ELIMINAR', tablaAfectada: 'inventario',
        registroAfectadoID: id,
        valorAnterior: { Nombre: existente.Nombre, Tipo: existente.Tipo, Valor: existente.Valor, Cantidad: existente.Cantidad },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Producto eliminado: ${existente.Nombre} (ID: ${id})`,
    });

    if (existente.Cantidad > 0) {
        auditoria.registrarInventario({
            inventarioID: id, nombreProducto: existente.Nombre,
            cedulaResponsable: auditCtx.actor?.cedula, nombreResponsable: auditCtx.actor?.nombre,
            tipoMovimiento: 'SALIDA',
            cantidadAnterior: existente.Cantidad, cantidadMovimiento: existente.Cantidad, cantidadPosterior: 0,
            valorUnitario: existente.Valor, motivo: 'BAJA',
            observaciones: 'Producto eliminado del sistema',
        });
    }
}

async function obtenerUno(id) {
    return await inventario.buscarPorId(id);
}

module.exports = { listar, listarAuditoriaMovimientos, listarAuditoriaInfo, crear, actualizar, eliminar, obtenerUno, TIPOS_VALIDOS };
