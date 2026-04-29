const { compra } = require('../../../infraestructura/persistenciaCliente');

async function inventarioCocina() {
    return compra.inventarioCocina();
}

async function clientePorPersona(personaId) {
    return compra.clientePorPersona(personaId);
}

async function crearClienteDesdeProspecto(personaId, datos, auditCtx) {
    return compra.crearClienteDesdeProspecto(personaId, datos, auditCtx);
}

async function crearCompra(cedulaCliente, actor, formaPago, notas, items, referidos, auditCtx) {
    return compra.crearCompra(cedulaCliente, actor, formaPago, notas, items, referidos, auditCtx);
}

async function registrarClienteLibre(datos, auditCtx) {
    return compra.registrarClienteLibre(datos, auditCtx);
}

async function listarComprasTrabajador(cedula) {
    return compra.listarComprasTrabajador(cedula);
}

module.exports = { inventarioCocina, clientePorPersona, crearClienteDesdeProspecto, crearCompra, registrarClienteLibre, listarComprasTrabajador };
