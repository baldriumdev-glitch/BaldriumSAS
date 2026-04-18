const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { buscarPorCedula } = require('../../db/trabajadorRepositorio');

/**
 * Autentica un trabajador con cédula y contraseña.
 * Las contraseñas en BD deben estar hasheadas con bcrypt.
 * Ejecutar persistencia/hashearContrasenas.js una sola vez para migrar.
 * @param {string} cedula
 * @param {string} contrasena  Contraseña en texto plano ingresada por el usuario
 * @returns {Promise<{ token: string, usuario: Object }>}
 * @throws {Error} si las credenciales son inválidas
 */
async function login(cedula, contrasena) {
    // 1. Buscar trabajador en la BD
    const resultado = await buscarPorCedula(cedula);
    if (!resultado) {
        throw new Error('Credenciales inválidas');
    }

    const { trabajador, roles } = resultado;

    // 2. Verificar contraseña con bcrypt
    //    La BD debe tener hashes bcrypt (ejecutar hashearContrasenas.js si no)
    const contrasenaValida = await bcrypt.compare(contrasena, trabajador.Contrasena);
    if (!contrasenaValida) {
        throw new Error('Credenciales inválidas');
    }

    // 3. Generar JWT con payload de usuario y roles
    const payload = {
        cedula: trabajador.Cedula,
        nombre: trabajador.Nombre,
        roles
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    // 4. Respuesta pública (sin contraseña hash)
    return {
        token,
        usuario: {
            cedula: trabajador.Cedula,
            nombre: trabajador.Nombre,
            celular: trabajador.Celular,
            telefono: trabajador.Telefono,
            correo: trabajador.CorreoElectronico,
            direccion: trabajador.Direccion,
            codigoTrabajador: trabajador.CodigoTrabajador,
            roles
        }
    };
}

module.exports = { login };
