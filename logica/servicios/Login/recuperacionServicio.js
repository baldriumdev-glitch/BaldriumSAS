const { buscarPorCorreo, actualizarContrasena } = require('../../db/trabajadorRepositorio');
const { enviarContrasenaTemp } = require('./emailServicio');

/**
 * Genera una contraseña temporal aleatoria de 10 caracteres.
 * Incluye mayúsculas, minúsculas y números.
 */
function generarContrasenaTemp() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
}

/**
 * Procesa la solicitud de recuperación de contraseña.
 * - Verifica que el correo exista en la BD
 * - Genera una contraseña temporal
 * - La guarda (hasheada) en la BD
 * - Envía la contraseña temporal al correo registrado
 *
 * @param {string} correo  Correo ingresado por el usuario
 */
async function olvideMiContrasena(correo) {
    // 1. Buscar trabajador por correo (case-insensitive via DB COLLATION)
    const trabajador = await buscarPorCorreo(correo.trim().toLowerCase());

    if (!trabajador) {
        // Respuesta genérica para no revelar si el correo existe o no
        throw new Error('Si el correo existe en el sistema, recibirás las instrucciones en breve.');
    }

    // 2. Generar contraseña temporal
    const contrasenaTemp = generarContrasenaTemp();

    // 3. Actualizar contraseña en BD (se guarda hasheada)
    await actualizarContrasena(trabajador.Cedula, contrasenaTemp);

    // 4. Enviar correo con la contraseña temporal
    await enviarContrasenaTemp(
        trabajador.CorreoElectronico,
        trabajador.Nombre,
        contrasenaTemp
    );

    return { mensaje: 'Si el correo existe en el sistema, recibirás las instrucciones en breve.' };
}

module.exports = { olvideMiContrasena };
