const repo = require('../../db/trabajadorRepositorio');

async function listar() {
    return await repo.listarTodosConRoles();
}

async function listarRoles() {
    return await repo.listarRoles();
}

async function crear(datos, rolesIds = []) {
    const { Cedula, Contrasena, Nombre, CorreoElectronico } = datos;
    if (!Cedula || !Contrasena || !Nombre) {
        throw new Error('Cédula, contraseña y nombre son requeridos.');
    }
    if (await repo.existeCedula(Cedula)) {
        throw new Error(`La cédula ${Cedula} ya está registrada.`);
    }
    if (CorreoElectronico && await repo.existeCorreo(CorreoElectronico)) {
        throw new Error(`El correo ${CorreoElectronico} ya está en uso por otro trabajador.`);
    }
    return await repo.crearTrabajador(datos, rolesIds);
}

async function actualizar(cedula, datos, rolesIds = []) {
    const todos = await repo.listarTodosConRoles();
    if (!todos.find(t => t.cedula === cedula)) {
        throw new Error('Trabajador no encontrado.');
    }
    await repo.actualizarTrabajador(cedula, datos, rolesIds);
}

async function cambiarEstado(cedula, activo) {
    await repo.cambiarEstado(cedula, activo);
}

async function obtenerUno(cedula) {
    const resultado = await repo.buscarPorCedula(cedula);
    if (!resultado) return null;
    const { trabajador, roles } = resultado;
    return {
        cedula:           trabajador.Cedula,
        nombre:           trabajador.Nombre,
        celular:          trabajador.Celular,
        telefono:         trabajador.Telefono,
        correo:           trabajador.CorreoElectronico,
        direccion:        trabajador.Direccion,
        codigoTrabajador: trabajador.CodigoTrabajador,
        activo:           !!trabajador.Activo,
        roles,
    };
}

module.exports = { listar, listarRoles, crear, actualizar, cambiarEstado, obtenerUno };
