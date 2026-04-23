const bcrypt  = require('bcrypt');
const { trabajador, auditoria } = require('../../infraestructura/persistenciaCliente');

async function obtenerPerfil(cedula) {
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');
    const { trabajador: t, roles } = resultado;
    return {
        cedula:           t.Cedula,
        codigoTrabajador: t.CodigoTrabajador,
        nombre:           t.Nombre,
        celular:          t.Celular,
        telefono:         t.Telefono,
        correo:           t.CorreoElectronico,
        direccion:        t.Direccion,
        roles
    };
}

async function actualizarPerfil(cedula, datos, auditCtx = {}) {
    const { Nombre, Celular, Telefono, CorreoElectronico, Direccion } = datos;
    if (!Nombre || !Celular || !CorreoElectronico || !Direccion) {
        throw new Error('Nombre, celular, correo y dirección son requeridos.');
    }

    const anterior = await obtenerPerfil(cedula);
    await trabajador.actualizarPerfil(cedula, { Nombre, Celular, Telefono, CorreoElectronico, Direccion });

    auditoria.registrarSistema({
        cedulaTrabajador: cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'EDITAR', tablaAfectada: 'trabajador',
        valorAnterior: { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion },
        valorNuevo:    { Nombre, Celular, CorreoElectronico, Direccion },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador actualizó su perfil: ${anterior.nombre} (${cedula})`,
    });
}

async function cambiarContrasena(cedula, contrasenaActual, nuevaContrasena, auditCtx = {}) {
    if (!contrasenaActual || !nuevaContrasena) {
        throw new Error('La contraseña actual y la nueva son requeridas.');
    }
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Usuario no encontrado.');

    const esValida = await bcrypt.compare(contrasenaActual, resultado.trabajador.Contrasena);
    if (!esValida) {
        auditoria.registrarSistema({
            cedulaTrabajador: cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CAMBIO_CONTRASENA', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `Intento fallido de cambio de contraseña: contraseña actual incorrecta`,
        });
        throw new Error('La contraseña actual es incorrecta.');
    }

    await trabajador.actualizarContrasena(cedula, nuevaContrasena);

    auditoria.registrarSistema({
        cedulaTrabajador: cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CAMBIO_CONTRASENA', tablaAfectada: 'trabajador',
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Cambio de contraseña exitoso: ${auditCtx.actor?.nombre} (${cedula})`,
    });
}

module.exports = { obtenerPerfil, actualizarPerfil, cambiarContrasena };
