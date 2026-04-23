const cliente = require('../../persistenciaCliente');

async function listar() {
    return await cliente.trabajador.listarTodosConRoles();
}

async function listarRoles() {
    return await cliente.trabajador.listarRoles();
}

async function crear(datos, rolesIds = []) {
    const { Cedula, Contrasena, Nombre, CorreoElectronico } = datos;
    if (!Cedula || !Contrasena || !Nombre) {
        throw new Error('Cédula, contraseña y nombre son requeridos.');
    }
    if (await cliente.trabajador.existeCedula(Cedula)) {
        throw new Error(`La cédula ${Cedula} ya está registrada.`);
    }
    if (CorreoElectronico && await cliente.trabajador.existeCorreo(CorreoElectronico)) {
        throw new Error(`El correo ${CorreoElectronico} ya está en uso por otro trabajador.`);
    }
    return await cliente.trabajador.crearTrabajador(datos, rolesIds);
}

async function actualizar(cedula, datos, rolesIds = []) {
    const todos = await cliente.trabajador.listarTodosConRoles();
    if (!todos.find(t => t.cedula === cedula)) {
        throw new Error('Trabajador no encontrado.');
    }
    await cliente.trabajador.actualizarTrabajador(cedula, datos, rolesIds);
}

async function cambiarEstado(cedula, activo) {
    await cliente.trabajador.cambiarEstado(cedula, activo);
}

async function obtenerUno(cedula) {
    const resultado = await cliente.trabajador.buscarPorCedula(cedula);
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
