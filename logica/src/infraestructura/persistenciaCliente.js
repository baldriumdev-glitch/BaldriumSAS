const BASE = () => process.env.PERSISTENCIA_URL || 'http://localhost:3001';

async function _req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE()}${path}`, opts);
    if (res.status === 404) return null;
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `Error ${res.status} en capa de persistencia`);
    }
    return res.json();
}

// ─── Trabajadores ────────────────────────────────────────────────────────────

const trabajador = {
    buscarPorCedula: (cedula) =>
        _req('GET', `/trabajadores/${encodeURIComponent(cedula)}`),

    crearTrabajador: (datos, rolesIds) =>
        _req('POST', '/trabajadores', { ...datos, rolesIds }),

    existeCedula: (cedula) =>
        _req('GET', `/trabajadores/existe-cedula/${encodeURIComponent(cedula)}`)
            .then(r => r?.existe ?? false),

    existeCorreo: (correo, excluirCedula = null) => {
        const qs = `correo=${encodeURIComponent(correo)}${excluirCedula ? `&excluir=${encodeURIComponent(excluirCedula)}` : ''}`;
        return _req('GET', `/trabajadores/existe-correo?${qs}`).then(r => r?.existe ?? false);
    },

    buscarPorCorreo: (correo) =>
        _req('GET', `/trabajadores/por-correo?correo=${encodeURIComponent(correo)}`),

    actualizarPerfil: (cedula, datos) =>
        _req('PUT', `/trabajadores/${encodeURIComponent(cedula)}/perfil`, datos),

    actualizarContrasena: (cedula, nuevaContrasena) =>
        _req('PATCH', `/trabajadores/${encodeURIComponent(cedula)}/contrasena`, { nuevaContrasena }),

    listarTodosConRoles: () =>
        _req('GET', '/trabajadores'),

    actualizarTrabajador: (cedula, datos, rolesIds) =>
        _req('PUT', `/trabajadores/${encodeURIComponent(cedula)}`, { ...datos, rolesIds }),

    cambiarEstado: (cedula, activo) =>
        _req('PATCH', `/trabajadores/${encodeURIComponent(cedula)}/estado`, { activo }),

    listarRoles: () =>
        _req('GET', '/trabajadores/roles'),
};

// ─── Inventario ──────────────────────────────────────────────────────────────

const inventario = {
    listarTodos: () =>
        _req('GET', '/inventario'),

    buscarPorId: (id) =>
        _req('GET', `/inventario/${id}`),

    crearProducto: async (datos) => {
        const r = await _req('POST', '/inventario', datos);
        return r?.id;
    },

    actualizarProducto: (id, datos) =>
        _req('PUT', `/inventario/${id}`, datos),

    eliminarProducto: (id) =>
        _req('DELETE', `/inventario/${id}`),

    existeNombre: (nombre, excluirId = null) => {
        const qs = `nombre=${encodeURIComponent(nombre)}${excluirId != null ? `&excluirId=${excluirId}` : ''}`;
        return _req('GET', `/inventario/existe-nombre?${qs}`).then(r => r?.existe ?? false);
    },
};

// ─── Auditoría ───────────────────────────────────────────────────────────────

const auditoria = {
    registrarSistema: (datos) =>
        _req('POST', '/auditoria/sistema', datos),

    listarSistema: (limite = 400) =>
        _req('GET', `/auditoria/sistema?limite=${limite}`),

    registrarInventario: (datos) =>
        _req('POST', '/auditoria/inventario', datos),

    listarInventario: (limite = 400) =>
        _req('GET', `/auditoria/inventario?limite=${limite}`),

    listarSistemaInventario: (limite = 400) =>
        _req('GET', `/auditoria/inventario/info?limite=${limite}`),
};

module.exports = { trabajador, inventario, auditoria };
