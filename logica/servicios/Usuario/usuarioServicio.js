const repo = require('../../db/trabajadorRepositorio');

async function listar() {
    return await repo.listarTodosConRoles();
}

async function listarRoles() {
    return await repo.listarRoles();
}

async function crear(datos, rolesIds = []) {
    const { Cedula, Contrasena, Nombre } = datos;
    if (!Cedula || !Contrasena || !Nombre) {
        throw new Error('Cédula, contraseña y nombre son requeridos.');
    }
    if (await repo.existeCedula(Cedula)) {
        throw new Error(`Ya existe un trabajador con cédula ${Cedula}.`);
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

module.exports = { listar, listarRoles, crear, actualizar, cambiarEstado };
