const { visita, auditoria } = require('../../../infraestructura/persistenciaCliente');

function _semanaActual() {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0=Dom
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        inicio: lunes.toISOString().split('T')[0],
        fin: domingo.toISOString().split('T')[0],
    };
}

async function listarSemana(cedula) {
    const { inicio, fin } = _semanaActual();
    return visita.listarSemana(cedula, inicio, fin);
}

async function listarMes(cedula) {
    const hoy = new Date();
    return visita.listarMes(cedula, hoy.getFullYear(), hoy.getMonth() + 1);
}

async function buscar(cedula, q) {
    return visita.buscar(cedula, q);
}

async function kpiSemana(cedula) {
    const { inicio, fin } = _semanaActual();
    return visita.kpiSemana(cedula, inicio, fin);
}

async function detallePersona(personaId) {
    return visita.detallePersona(personaId);
}

async function historialCompras(personaId) {
    return visita.historialCompras(personaId);
}

async function historialVisitas(personaId) {
    return visita.historialVisitas(personaId);
}

async function obtenerAlimentacion() {
    return visita.inventarioAlimentacion();
}

async function cambiarEstado(visitaId, estado, suplementos = [], auditCtx = {}, notas = null) {
    await visita.cambiarEstado(visitaId, estado, notas);
    if (estado === 'Visitado' && suplementos.length > 0) {
        try {
            await visita.guardarSuplemento(visitaId, suplementos, auditCtx.actor);
        } catch (err) {
            console.error('[Suplemento] Error al guardar:', err.message);
        }
    }
    try {
        await auditoria.registrarSistema({
            cedulaTrabajador: auditCtx.actor?.cedula ?? null,
            nombreTrabajador: auditCtx.actor?.nombre ?? null,
            tipoAccion: 'EDITAR',
            tablaAfectada: 'visita_estado',
            registroAfectadoID: visitaId,
            valorNuevo: estado,
            descripcion: `Estado de visita #${visitaId} cambiado a "${estado}"`,
            direccionIP: auditCtx.ip ?? null,
            dispositivo: auditCtx.device ?? null,
        });
    } catch (err) {
        console.error('[Auditoría] Error al registrar cambio de estado:', err.message);
    }
}

module.exports = { listarSemana, listarMes, buscar, kpiSemana, detallePersona, historialCompras, historialVisitas, obtenerAlimentacion, cambiarEstado };
