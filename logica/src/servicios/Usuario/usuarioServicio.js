const { trabajador, auditoria } = require('../../infraestructura/persistenciaCliente');

async function listar() {
    return await trabajador.listarTodosConRoles();
}

async function listarRoles() {
    return await trabajador.listarRoles();
}

async function listarAuditoria(limite = 400) {
    return await auditoria.listarSistema(limite);
}

async function crear(datos, rolesIds = [], auditCtx = {}) {
    const { Cedula, Contrasena, Nombre, CorreoElectronico } = datos;
    if (!Cedula || !Contrasena || !Nombre) {
        throw new Error('Cédula, contraseña y nombre son requeridos.');
    }

    if (await trabajador.existeCedula(Cedula)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `La cédula ${Cedula} ya está registrada.`,
        });
        throw new Error(`La cédula ${Cedula} ya está registrada.`);
    }

    if (CorreoElectronico && await trabajador.existeCorreo(CorreoElectronico)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `El correo ${CorreoElectronico} ya está en uso.`,
        });
        throw new Error(`El correo ${CorreoElectronico} ya está en uso por otro trabajador.`);
    }

    const nuevo = await trabajador.crearTrabajador(datos, rolesIds);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
        valorNuevo: { Cedula, Nombre, CodigoTrabajador: datos.CodigoTrabajador, Celular: datos.Celular, CorreoElectronico, roles: rolesIds },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador creado: ${Nombre} (${Cedula})`,
    });

    return nuevo;
}

async function actualizar(cedula, datos, rolesIds = [], auditCtx = {}) {
    const anterior = await obtenerUno(cedula);
    if (!anterior) throw new Error('Trabajador no encontrado.');

    await trabajador.actualizarTrabajador(cedula, datos, rolesIds);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'EDITAR', tablaAfectada: 'trabajador',
        valorAnterior: { Nombre: anterior.nombre, Celular: anterior.celular, CorreoElectronico: anterior.correo, Direccion: anterior.direccion, roles: anterior.roles },
        valorNuevo:    { Nombre: datos.Nombre,    Celular: datos.Celular,    CorreoElectronico: datos.CorreoElectronico, Direccion: datos.Direccion, roles: rolesIds },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador editado: ${anterior.nombre} (${cedula})`,
    });
}

async function cambiarEstado(cedula, activo, auditCtx = {}) {
    await trabajador.cambiarEstado(cedula, activo);

    auditoria.registrarSistema({
        cedulaTrabajador: auditCtx.actor?.cedula,
        nombreTrabajador: auditCtx.actor?.nombre,
        tipoAccion: 'CAMBIO_ESTADO', tablaAfectada: 'trabajador',
        valorAnterior: { Activo: !activo },
        valorNuevo:    { Activo: activo },
        direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
        resultado: 'EXITOSO',
        descripcion: `Trabajador ${cedula} ${activo ? 'activado' : 'desactivado'}`,
    });
}

async function obtenerUno(cedula) {
    const resultado = await trabajador.buscarPorCedula(cedula);
    if (!resultado) return null;
    const { trabajador: t, roles } = resultado;
    return {
        cedula:           t.Cedula,
        nombre:           t.Nombre,
        celular:          t.Celular,
        telefono:         t.Telefono,
        correo:           t.CorreoElectronico,
        direccion:        t.Direccion,
        codigoTrabajador: t.CodigoTrabajador,
        activo:           !!t.Activo,
        roles,
    };
}

module.exports = { listar, listarRoles, listarAuditoria, crear, actualizar, cambiarEstado, obtenerUno };
