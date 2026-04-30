// ── Sesión y fetch autenticado ───────────────────────────────────────────────
// Depende de: config.js (API)

const token  = localStorage.getItem('baldrium_token');
const usuario = JSON.parse(localStorage.getItem('baldrium_user') || 'null');

function cerrarSesion() {
  localStorage.removeItem('baldrium_token');
  localStorage.removeItem('baldrium_user');
  window.location.href = 'login.html';
}

// Wrapper de fetch: adjunta el token y redirige al login si el servidor devuelve 401.
async function apiFetch(endpoint, options = {}) {
  try {
    const r = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        ...(options.headers || {}),
      },
    });
    if (r.status === 401) { cerrarSesion(); return null; }
    return r;
  } catch {
    return null;
  }
}
