// ── App: init de sesión, header, tabs y perfil ───────────────────────────────
// Depende de: config.js, auth.js, utils.js y todos los módulos
// Este archivo debe cargarse ÚLTIMO (después de todos los módulos).

// ── Validación de sesión ──────────────────────────────────────────────────────

if (!token || !usuario) {
  window.location.href = 'login.html';
}

(async () => {
  try {
    const r = await fetch(`${API}${ENDPOINTS.PERFIL.GET}`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (r.status === 401) {
      localStorage.removeItem('baldrium_token');
      localStorage.removeItem('baldrium_user');
      window.location.href = 'login.html';
    }
  } catch {
    // Error de red transitorio — no redirigir
  }
})();

// ── Header ────────────────────────────────────────────────────────────────────

(function renderHeader() {
  document.getElementById('userAvatar').textContent   = iniciales(usuario.nombre);
  document.getElementById('userName').textContent     = usuario.nombre;
  document.getElementById('userRolesText').textContent = (usuario.roles || []).join(' · ');
})();

// ── Tabs de módulos ───────────────────────────────────────────────────────────

const MODULOS = {
  'Director':          renderModuloDirector,
  'Coordinador':       renderModuloCoordinador,
  'Asesor comercial':  renderModuloAsesorComercial,
};

function construirTabs(roles) {
  const container = document.getElementById('rolTabs');
  container.innerHTML = '';
  roles.forEach((rol, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === 0 ? ' active' : '');
    btn.textContent = rol;
    btn.onclick = () => seleccionarTab(rol, btn);
    container.appendChild(btn);
  });
  if (roles.length > 0) {
    seleccionarTab(roles[0], container.querySelector('.tab-btn.active'));
  }
}

function seleccionarTab(rol, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('headerModule').textContent = rol;
  const content = document.getElementById('moduleContent');
  if (MODULOS[rol]) {
    MODULOS[rol](content);
  } else {
    content.innerHTML = `
      <div class="card wip-card">
        <div class="wip-icon">🚧</div>
        <div class="wip-title">Módulo: ${rol}</div>
        <p class="wip-sub">Este módulo está en construcción.</p>
      </div>`;
  }
}

construirTabs(usuario.roles || []);

// ── Perfil ────────────────────────────────────────────────────────────────────

function irAPerfil() {
  document.getElementById('tabsSection').style.display    = 'none';
  document.getElementById('profileSection').style.display = 'block';
  document.getElementById('headerModule').textContent     = 'Mi Perfil';
  document.getElementById('btnPerfil').classList.add('active');
  cargarPerfil();
}

function volverAlPanel() {
  document.getElementById('profileSection').style.display = 'none';
  document.getElementById('tabsSection').style.display    = 'block';
  document.getElementById('btnPerfil').classList.remove('active');
  const tabActivo = document.querySelector('.tab-btn.active');
  document.getElementById('headerModule').textContent = tabActivo ? tabActivo.textContent : 'Panel';
}

async function cargarPerfil() {
  const r = await apiFetch(ENDPOINTS.PERFIL.GET);
  if (!r) return;
  const data = await r.json();
  if (!r.ok) return;

  document.getElementById('profileAvatar').textContent = iniciales(data.nombre);
  document.getElementById('profileNombre').textContent = data.nombre;
  document.getElementById('profileCedula').textContent = data.cedula;
  document.getElementById('profileCodigo').textContent = data.codigoTrabajador;

  document.getElementById('profileRolesBadges').innerHTML =
    (data.roles || []).map(r => `<span class="badge badge-purple" style="margin:2px">${r}</span>`).join('');

  document.getElementById('pNombre').value    = data.nombre;
  document.getElementById('pCelular').value   = data.celular;
  document.getElementById('pTelefono').value  = data.telefono || '';
  document.getElementById('pCorreo').value    = data.correo;
  document.getElementById('pDireccion').value = data.direccion;

  ['pContrasenaActual','pNuevaContrasena','pConfirmarContrasena'].forEach(id => {
    document.getElementById(id).value = '';
  });
  setStatus('perfilInfoStatus', 'idle', '⏳ Modifica los campos y guarda los cambios');
  setStatus('perfilPassStatus', 'idle', '⏳ Completa los tres campos para cambiar tu contraseña');
}

async function guardarInfoPerfil() {
  const datos = {
    Nombre:            document.getElementById('pNombre').value.trim(),
    Celular:           document.getElementById('pCelular').value.trim(),
    Telefono:          document.getElementById('pTelefono').value.trim() || null,
    CorreoElectronico: document.getElementById('pCorreo').value.trim(),
    Direccion:         document.getElementById('pDireccion').value.trim(),
  };

  if (!datos.Nombre || !datos.Celular || !datos.CorreoElectronico || !datos.Direccion) {
    setStatus('perfilInfoStatus', 'error', '❌ Nombre, celular, correo y dirección son obligatorios');
    return;
  }

  const btn = document.getElementById('btnGuardarInfo');
  btn.disabled = true;
  setStatus('perfilInfoStatus', 'loading', '<span class="spinner"></span> Guardando...');

  const r = await apiFetch(ENDPOINTS.PERFIL.UPDATE, { method: 'PUT', body: JSON.stringify(datos) });
  btn.disabled = false;
  if (!r) return;

  const data = await r.json();
  if (r.ok) {
    setStatus('perfilInfoStatus', 'ok', '✅ ' + data.mensaje);
    document.getElementById('profileNombre').textContent = datos.Nombre;
    document.getElementById('userName').textContent      = datos.Nombre;
    document.getElementById('userAvatar').textContent    = iniciales(datos.Nombre);
    document.getElementById('profileAvatar').textContent = iniciales(datos.Nombre);
    const uStored = JSON.parse(localStorage.getItem('baldrium_user') || '{}');
    uStored.nombre = datos.Nombre;
    uStored.correo = datos.CorreoElectronico;
    localStorage.setItem('baldrium_user', JSON.stringify(uStored));
  } else {
    setStatus('perfilInfoStatus', 'error', '❌ ' + (data.error || 'Error al guardar'));
  }
}

async function cambiarContrasena() {
  const actual    = document.getElementById('pContrasenaActual').value;
  const nueva     = document.getElementById('pNuevaContrasena').value;
  const confirmar = document.getElementById('pConfirmarContrasena').value;

  if (!actual || !nueva || !confirmar) {
    setStatus('perfilPassStatus', 'error', '❌ Completa los tres campos'); return;
  }
  if (nueva !== confirmar) {
    setStatus('perfilPassStatus', 'error', '❌ La nueva contraseña y su confirmación no coinciden'); return;
  }
  if (nueva.length < 6) {
    setStatus('perfilPassStatus', 'error', '❌ La nueva contraseña debe tener al menos 6 caracteres'); return;
  }

  const btn = document.getElementById('btnCambiarPass');
  btn.disabled = true;
  setStatus('perfilPassStatus', 'loading', '<span class="spinner"></span> Cambiando contraseña...');

  const r = await apiFetch(ENDPOINTS.PERFIL.CONTRASENA, {
    method: 'PATCH',
    body: JSON.stringify({ contrasenaActual: actual, nuevaContrasena: nueva }),
  });
  btn.disabled = false;
  if (!r) return;

  const data = await r.json();
  if (r.ok) {
    setStatus('perfilPassStatus', 'ok', '✅ ' + data.mensaje);
    ['pContrasenaActual','pNuevaContrasena','pConfirmarContrasena'].forEach(id => {
      document.getElementById(id).value = '';
    });
  } else {
    setStatus('perfilPassStatus', 'error', '❌ ' + (data.error || 'Error al cambiar la contraseña'));
  }
}

// ── Atajos de teclado globales ────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  cerrarModalUsuario?.();
  cerrarModalInventario?.();
  cerrarConfirmElim?.();
  cerrarCambiarEstado?.();
  cerrarDetallePersona?.();
  cerrarNuevaCompra?.();
});
