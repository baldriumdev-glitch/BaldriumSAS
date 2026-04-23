const cliente = require('../../persistenciaCliente');
const { enviarContrasenaTemp } = require('./emailServicio');

function generarContrasenaTemp() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

async function olvideMiContrasena(correo) {
    const trabajador = await cliente.trabajador.buscarPorCorreo(correo.trim().toLowerCase());

    if (!trabajador) {
        throw new Error('Si el correo existe en el sistema, recibirás las instrucciones en breve.');
    }

    const contrasenaTemp = generarContrasenaTemp();

    await cliente.trabajador.actualizarContrasena(trabajador.Cedula, contrasenaTemp);

    await enviarContrasenaTemp(trabajador.CorreoElectronico, trabajador.Nombre, contrasenaTemp);

    return { mensaje: 'Si el correo existe en el sistema, recibirás las instrucciones en breve.' };
}

module.exports = { olvideMiContrasena };
