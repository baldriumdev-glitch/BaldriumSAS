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
    return compra.listarComprasTrabajador(Number(cedula));
}

function _semanaActual() {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        inicio: lunes.toISOString().split('T')[0],
        fin:    domingo.toISOString().split('T')[0],
    };
}

async function listarComprasTrabajadorSemana(cedula) {
    const { inicio, fin } = _semanaActual();
    return compra.listarComprasTrabajadorSemana(Number(cedula), inicio, fin);
}

async function listarComprasTrabajadorMes(cedula) {
    const hoy = new Date();
    return compra.listarComprasTrabajadorMes(Number(cedula), hoy.getFullYear(), hoy.getMonth() + 1);
}

async function kpiComprasMes(cedula) {
    const hoy = new Date();
    return compra.kpiComprasMes(Number(cedula), hoy.getFullYear(), hoy.getMonth() + 1);
}

async function buscarComprasTrabajador(cedula, q) {
    return compra.buscarComprasTrabajador(Number(cedula), q);
}

module.exports = {
    inventarioCocina,
    clientePorPersona,
    crearClienteDesdeProspecto,
    crearCompra,
    registrarClienteLibre,
    listarComprasTrabajador,
    listarComprasTrabajadorSemana,
    listarComprasTrabajadorMes,
    kpiComprasMes,
    buscarComprasTrabajador
};