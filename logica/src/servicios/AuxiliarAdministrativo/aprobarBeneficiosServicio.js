const { beneficio } = require('../../infraestructura/persistenciaCliente');

async function listarEnRevision() {
    return beneficio.listarEnRevision();
}

async function listarProductosDisponibles() {
    return beneficio.listarProductosDisponibles();
}

async function cambiarEstado(beneficioId, estado, inventarioId, auditCtx) {
    return beneficio.cambiarEstado(beneficioId, estado, inventarioId, auditCtx);
}

module.exports = { listarEnRevision, listarProductosDisponibles, cambiarEstado };
