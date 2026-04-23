const bcrypt  = require('bcrypt');
const cliente = require('../../persistenciaCliente');

async function obtenerPerfil(cedula) {
    const resultado = await cliente.trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');

    const { trabajador, roles } = resultado;
    return {
        cedula:           trabajador.Cedula,
        codigoTrabajador: trabajador.CodigoTrabajador,
        nombre:           trabajador.Nombre,
        celular:          trabajador.Celular,
        telefono:         trabajador.Telefono,
        correo:           trabajador.CorreoElectronico,
        direccion:        trabajador.Direccion,
        roles
    };
}

async function actualizarPerfil(cedula, datos) {
    const { Nombre, Celular, Telefono, CorreoElectronico, Direccion } = datos;
    if (!Nombre || !Celular || !CorreoElectronico || !Direccion) {
        throw new Error('Nombre, celular, correo y dirección son requeridos.');
    }
    await cliente.trabajador.actualizarPerfil(cedula, { Nombre, Celular, Telefono, CorreoElectronico, Direccion });
}

async function cambiarContrasena(cedula, contrasenaActual, nuevaContrasena) {
    if (!contrasenaActual || !nuevaContrasena) {
        throw new Error('La contraseña actual y la nueva son requeridas.');
    }
    const resultado = await cliente.trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');

    const esValida = await bcrypt.compare(contrasenaActual, resultado.trabajador.Contrasena);
    if (!esValida) throw new Error('La contraseña actual es incorrecta.');

    await cliente.trabajador.actualizarContrasena(cedula, nuevaContrasena);
}

module.exports = { obtenerPerfil, actualizarPerfil, cambiarContrasena };
