const { trabajador, auditoria, beneficio } = require('../../infraestructura/persistenciaCliente');

// Errores de negocio: se distinguen de fallos inesperados para que la ruta
// pueda responder 400/409 con el mensaje específico del campo en vez de un
// 500 genérico (ver hallazgos de QA sobre validación de creación de usuarios).
class ValidationError extends Error {}
class ConflictError extends Error {}

const REGEX_SOLO_DIGITOS = /^\d+$/;
const REGEX_NOMBRE       = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s'.-]+$/;

// Valida formato/longitud de los campos compartidos entre crear y actualizar,
// ANTES de tocar la base de datos, para nunca dejar que un tipo incorrecto
// (letras en un campo numérico, texto demasiado largo) llegue a un 500 de MySQL.
function _validarCamposTrabajador({ Nombre, Cedula, Celular, Telefono, CorreoElectronico, Direccion, CodigoTrabajador }) {
    if (Nombre !== undefined) {
        if (Nombre.trim().length < 3 || Nombre.length > 100) {
            throw new ValidationError('El nombre debe tener entre 3 y 100 caracteres.');
        }
        if (!REGEX_NOMBRE.test(Nombre)) {
            throw new ValidationError('El nombre solo puede contener letras y espacios.');
        }
    }

    if (Cedula !== undefined) {
        if (!REGEX_SOLO_DIGITOS.test(Cedula)) {
            throw new ValidationError('La cédula solo puede contener números.');
        }
        if (Cedula.length < 6 || Cedula.length > 15) {
            throw new ValidationError('La cédula debe tener entre 6 y 15 dígitos.');
        }
    }

    if (Celular !== undefined) {
        if (!REGEX_SOLO_DIGITOS.test(String(Celular))) {
            throw new ValidationError('El celular solo puede contener números.');
        }
        if (String(Celular).length < 7 || String(Celular).length > 15) {
            throw new ValidationError('El celular debe tener entre 7 y 15 dígitos.');
        }
    }

    if (Telefono) {
        if (!REGEX_SOLO_DIGITOS.test(String(Telefono))) {
            throw new ValidationError('El teléfono solo puede contener números.');
        }
        if (String(Telefono).length > 15) {
            throw new ValidationError('El teléfono debe tener máximo 15 dígitos.');
        }
    }

    if (CorreoElectronico !== undefined && CorreoElectronico.length > 100) {
        throw new ValidationError('El correo debe tener máximo 100 caracteres.');
    }

    if (Direccion && Direccion.length > 200) {
        throw new ValidationError('La dirección debe tener máximo 200 caracteres.');
    }

    if (CodigoTrabajador && CodigoTrabajador.length > 50) {
        throw new ValidationError('El código de trabajador debe tener máximo 50 caracteres.');
    }
}

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
    const { Cedula, Contrasena, Nombre, Celular, CorreoElectronico, Direccion, CodigoTrabajador } = datos;
    if (!Cedula || !Contrasena || !Nombre || !Celular || !CorreoElectronico || !Direccion || !CodigoTrabajador) {
        throw new ValidationError('Cédula, contraseña, nombre, celular, correo, dirección y código de trabajador son requeridos.');
    }
    if (!Array.isArray(rolesIds) || rolesIds.length === 0) {
        throw new ValidationError('Debes asignar al menos un rol al trabajador.');
    }
    if (Contrasena.length < 6) {
        throw new ValidationError('La contraseña debe tener al menos 6 caracteres.');
    }
    _validarCamposTrabajador(datos);

    if (await trabajador.existeCedula(Cedula)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `La cédula ${Cedula} ya está registrada.`,
        });
        throw new ConflictError(`La cédula ${Cedula} ya está registrada.`);
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
        throw new ConflictError(`El correo ${CorreoElectronico} ya está en uso por otro trabajador.`);
    }

    if (CodigoTrabajador && await trabajador.existeCodigoTrabajador(CodigoTrabajador)) {
        auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula,
            nombreTrabajador: auditCtx.actor?.nombre,
            tipoAccion: 'CREAR', tablaAfectada: 'trabajador',
            direccionIP: auditCtx.ip, dispositivo: auditCtx.device,
            resultado: 'FALLIDO',
            descripcion: `El código de trabajador ${CodigoTrabajador} ya está en uso.`,
        });
        throw new ConflictError(`El código de trabajador ${CodigoTrabajador} ya está en uso por otro trabajador.`);
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

    if (!Array.isArray(rolesIds) || rolesIds.length === 0) {
        throw new ValidationError('Debes asignar al menos un rol al trabajador.');
    }
    _validarCamposTrabajador(datos);

    if (datos.CorreoElectronico && await trabajador.existeCorreo(datos.CorreoElectronico, cedula)) {
        throw new ConflictError(`El correo ${datos.CorreoElectronico} ya está en uso por otro trabajador.`);
    }

    if (datos.CodigoTrabajador && await trabajador.existeCodigoTrabajador(datos.CodigoTrabajador, cedula)) {
        throw new ConflictError(`El código de trabajador ${datos.CodigoTrabajador} ya está en uso por otro trabajador.`);
    }

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
    const anterior = await obtenerUno(cedula);
    if (!anterior) throw new Error('Trabajador no encontrado.');

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

async function obtenerParametrosBeneficio() {
    return beneficio.obtenerParametros();
}

async function actualizarParametrosBeneficio(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx = {}) {
    return beneficio.actualizarParametros(valorMinimoCompra, minimoReferidosVisitados, valorMinimoCompraReferido, auditCtx);
}

module.exports = {
    listar, listarRoles, listarAuditoria, crear, actualizar, cambiarEstado, obtenerUno,
    obtenerParametrosBeneficio, actualizarParametrosBeneficio,
    ValidationError, ConflictError,
};
