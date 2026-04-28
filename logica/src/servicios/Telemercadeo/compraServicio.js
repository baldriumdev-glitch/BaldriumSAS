const { compra } = require('../../infraestructura/persistenciaCliente');

async function inventarioCocina() {
    return compra.inventarioCocina();
}

async function clientePorPersona(personaId) {
    return compra.clientePorPersona(personaId);
}

async function crearClienteDesdeProspecto(personaId, datos, auditCtx) {
    return compra.crearClienteDesdeProspecto(personaId, datos, auditCtx);
}

async function crearCompra(cedulaCliente, actor, formaPago, notas, items) {
    return compra.crearCompra(cedulaCliente, actor, formaPago, notas, items);
}

async function registrarClienteLibre(datos, auditCtx) {
    return compra.registrarClienteLibre(datos, auditCtx);
}

module.exports = { inventarioCocina, clientePorPersona, crearClienteDesdeProspecto, crearCompra, registrarClienteLibre };
