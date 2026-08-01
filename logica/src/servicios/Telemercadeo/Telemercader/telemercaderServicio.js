const { prospecto, visita } = require('../../../infraestructura/persistenciaCliente');

async function listarPendientes() {
    return prospecto.listarPendientes();
}

async function listarEnGestion() {
    return prospecto.listarEnGestion();
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

async function listarVisitasSemanaVisitadas() {
    const { inicio, fin } = _semanaActual();
    return visita.listarSemanaVisitadas(inicio, fin);
}

async function listarVisitasSemanaPorGestionar() {
    const { inicio, fin } = _semanaActual();
    return visita.listarSemanaPorGestionar(inicio, fin);
}

module.exports = { listarPendientes, listarEnGestion, listarVisitasSemanaVisitadas, listarVisitasSemanaPorGestionar };
