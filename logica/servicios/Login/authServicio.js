const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const cliente = require('../../persistenciaCliente');

async function login(cedula, contrasena) {
    const resultado = await cliente.trabajador.buscarPorCedula(cedula);
    if (!resultado) throw new Error('Credenciales inválidas');

    const { trabajador, roles } = resultado;

    if (!trabajador.Activo) {
        throw new Error('Tu cuenta está desactivada. Contacta a tu administrador.');
    }

    const contrasenaValida = await bcrypt.compare(contrasena, trabajador.Contrasena);
    if (!contrasenaValida) throw new Error('Credenciales inválidas');

    const payload = { cedula: trabajador.Cedula, nombre: trabajador.Nombre, roles };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    return {
        token,
        usuario: {
            cedula:           trabajador.Cedula,
            nombre:           trabajador.Nombre,
            celular:          trabajador.Celular,
            telefono:         trabajador.Telefono,
            correo:           trabajador.CorreoElectronico,
            direccion:        trabajador.Direccion,
            codigoTrabajador: trabajador.CodigoTrabajador,
            roles
        }
    };
}

module.exports = { login };
