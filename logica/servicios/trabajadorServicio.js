const { crearTrabajador, existeCedula } = require('../db/trabajadorRepositorio');

/**
 * Registra un nuevo trabajador con contraseña hasheada.
 * @param {Object} datos  Campos del trabajador
 * @param {number[]} roles  Array de IDs de rol
 * REGISTRAR TRABAJADOR!!!
 */
async function registrar(datos, roles = []) {
    const { Cedula, Contrasena, Nombre } = datos;

    if (!Cedula || !Contrasena || !Nombre) {
        throw new Error('Cédula, contraseña y nombre son requeridos.');
    }

    if (await existeCedula(Cedula)) {
        throw new Error(`Ya existe un trabajador con cédula ${Cedula}.`);
    }

    return await crearTrabajador(datos, roles);
}

module.exports = { registrar };
