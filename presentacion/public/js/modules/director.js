// ── Módulo Director: Usuarios y Auditoría del Sistema ────────────────────────
// Depende de: config.js, auth.js, utils.js

let usuariosData      = [];
let auditoriaData     = [];
let rolesDisponibles  = [];
let editandoCedula    = null;

function renderModuloDirector(container) {
  container.innerHTML = `
    <div class="card">
      <div class="sub-tabs">
        <button class="sub-tab-btn active" id="subTabUsuariosBtn"
          onclick="seleccionarSubTab('usuarios', this)">👥 Usuarios</button>
        <button class="sub-tab-btn" id="subTabAuditoriaBtn"
          onclick="seleccionarSubTab('auditoria', this)">🔍 Auditoría Sistema</button>
      </div>
      <div id="subContent"></div>
    </div>`;
  seleccionarSubTab('usuarios', document.getElementById('subTabUsuariosBtn'));
}

function seleccionarSubTab(cual, btn) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sc = document.getElementById('subContent');
  if (cual === 'usuarios') renderSubTabUsuarios(sc);
  else renderSubTabAuditoria(sc);
}

// ── Sub-tab: Usuarios ────────────────────────────────────────────────────────

function renderSubTabUsuarios(container) {
  container.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <div class="dot" style="background:var(--green)"></div>
        Gestión de Usuarios — Trabajadores
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div class="search-wrap">
          <span class="search-icon">🔎</span>
          <input type="text" id="searchUsuarios" placeholder="Buscar cédula, nombre, correo..."
            oninput="filtrarUsuarios(this.value)" />
        </div>
        <button class="btn-add" onclick="abrirModalCrear()">➕ Nuevo Usuario</button>
      </div>
    </div>

    <div id="tablaStatus" class="status-bar status-loading">
      <span class="spinner"></span> Cargando trabajadores...
    </div>

    <div class="tabla-wrap">
      <table id="tablaUsuarios" style="display:none;">
        <thead>
          <tr>
            <th>Cédula</th><th>Código</th><th>Nombre</th>
            <th>Celular</th><th>Correo</th><th>Roles</th>
            <th>Estado</th><th style="text-align:center;">Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaBody"></tbody>
      </table>
    </div>
    <p id="tablaVacia" style="color:var(--muted); font-size:.85rem; padding:8px 0; display:none;">
      No hay trabajadores registrados.
    </p>`;
  cargarUsuarios();
}

function filtrarUsuarios(texto) {
  const q = texto.toLowerCase();
  renderTablaUsuarios(usuariosData.filter(u =>
    u.cedula.toLowerCase().includes(q) ||
    u.nombre.toLowerCase().includes(q) ||
    (u.correo || '').toLowerCase().includes(q) ||
    (u.codigoTrabajador || '').toLowerCase().includes(q)
  ));
}

async function cargarUsuarios() {
  const statusEl = document.getElementById('tablaStatus');
  if (!statusEl) return;
  const r = await apiFetch(ENDPOINTS.USUARIO.LIST);
  if (!r) return;
  const data = await r.json();
  if (!r.ok) {
    statusEl.className = 'status-bar status-error';
    statusEl.innerHTML = '❌ ' + (data.error || 'Error al cargar los usuarios');
    return;
  }
  usuariosData = data;
  statusEl.style.display = 'none';
  renderTablaUsuarios(data);
}

function renderTablaUsuarios(usuarios) {
  const tabla = document.getElementById('tablaUsuarios');
  const vacia = document.getElementById('tablaVacia');
  const body  = document.getElementById('tablaBody');
  if (!tabla) return;
  if (!usuarios.length) {
    tabla.style.display = 'none'; vacia.style.display = 'block'; return;
  }
  tabla.style.display = 'table'; vacia.style.display = 'none';
  body.innerHTML = usuarios.map(u => `
    <tr>
      <td><span style="font-family:'JetBrains Mono',monospace; font-size:.78rem; color:var(--muted);">${u.cedula}</span></td>
      <td style="color:var(--muted); font-size:.8rem;">${u.codigoTrabajador}</td>
      <td><strong>${u.nombre}</strong></td>
      <td style="font-size:.82rem;">${u.celular}</td>
      <td style="font-size:.8rem; color:var(--muted);">${u.correo}</td>
      <td>
        ${(u.roles || []).map(r =>
          `<span class="badge badge-purple" style="margin:2px; font-size:.65rem;">${r.nombre}</span>`
        ).join('') || '<span style="color:var(--muted); font-size:.78rem;">Sin rol</span>'}
      </td>
      <td><span class="badge ${u.activo ? 'badge-green' : 'badge-red'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
          <button class="action-btn btn-edit" onclick="abrirModalEditar('${u.cedula}')">✏️ Editar</button>
          ${u.activo
            ? `<button class="action-btn btn-delete" onclick="toggleEstado('${u.cedula}', false)">🗑️ Eliminar</button>`
            : `<button class="action-btn btn-restore" onclick="toggleEstado('${u.cedula}', true)">↩ Restaurar</button>`}
        </div>
      </td>
    </tr>`).join('');
}

async function toggleEstado(cedula, nuevoEstado) {
  const r = await apiFetch(ENDPOINTS.USUARIO.ESTADO(cedula), {
    method: 'PATCH',
    body: JSON.stringify({ activo: nuevoEstado }),
  });
  if (!r) return;
  if (r.ok) {
    await cargarUsuarios();
  } else {
    const data = await r.json();
    alert('Error: ' + (data.error || 'No se pudo cambiar el estado'));
  }
}

// ── Modal Crear / Editar usuario ─────────────────────────────────────────────

async function abrirModalCrear() {
  editandoCedula = null;
  document.getElementById('modalIcon').textContent = '👤';
  document.getElementById('modalTitulo').textContent = 'Nuevo Usuario';
  document.getElementById('modalSub').textContent = 'Completa los campos para registrar un nuevo trabajador.';
  document.getElementById('uCedula').disabled = false;
  ['uCedula','uCodigo','uNombre','uCelular','uTelefono','uCorreo','uDireccion','uContrasena']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('contrasenaGroup').style.display = 'block';
  setStatus('modalStatus', 'idle', '⏳ Completa los campos requeridos (*)');
  await cargarRolesCheckboxes([]);
  document.getElementById('modalUsuario').classList.add('open');
  setTimeout(() => document.getElementById('uCedula').focus(), 80);
}

async function abrirModalEditar(cedula) {
  const u = usuariosData.find(x => x.cedula === cedula);
  if (!u) return;
  editandoCedula = cedula;
  document.getElementById('modalIcon').textContent = '✏️';
  document.getElementById('modalTitulo').textContent = 'Editar Usuario';
  document.getElementById('modalSub').textContent = `Modificando datos de ${u.nombre}`;
  document.getElementById('uCedula').value = cedula;
  document.getElementById('uCedula').disabled = true;
  document.getElementById('uCodigo').value = u.codigoTrabajador;
  document.getElementById('uNombre').value = u.nombre;
  document.getElementById('uCelular').value = u.celular;
  document.getElementById('uTelefono').value = u.telefono || '';
  document.getElementById('uCorreo').value = u.correo;
  document.getElementById('uDireccion').value = u.direccion;
  document.getElementById('contrasenaGroup').style.display = 'none';
  setStatus('modalStatus', 'idle', '⏳ Modifica los campos necesarios');
  await cargarRolesCheckboxes((u.roles || []).map(r => r.id));
  document.getElementById('modalUsuario').classList.add('open');
}

async function cargarRolesCheckboxes(selectedIds) {
  if (!rolesDisponibles.length) {
    const r = await apiFetch(ENDPOINTS.USUARIO.ROLES);
    if (r && r.ok) rolesDisponibles = await r.json();
  }
  document.getElementById('rolesCheckboxes').innerHTML = rolesDisponibles.map(rol => `
    <label class="checkbox-label">
      <input type="checkbox" value="${rol.id}" ${selectedIds.includes(rol.id) ? 'checked' : ''} />
      ${rol.nombre}
    </label>`).join('');
}

function cerrarModalUsuario() { document.getElementById('modalUsuario').classList.remove('open'); }
function cerrarModalSiOverlay(e) { if (e.target === document.getElementById('modalUsuario')) cerrarModalUsuario(); }

function getRolesSeleccionados() {
  return [...document.querySelectorAll('#rolesCheckboxes input[type=checkbox]:checked')]
    .map(cb => parseInt(cb.value));
}

async function guardarUsuario() {
  const datos = {
    Cedula:            document.getElementById('uCedula').value.trim(),
    CodigoTrabajador:  document.getElementById('uCodigo').value.trim(),
    Nombre:            document.getElementById('uNombre').value.trim(),
    Celular:           document.getElementById('uCelular').value.trim(),
    Telefono:          document.getElementById('uTelefono').value.trim() || null,
    CorreoElectronico: document.getElementById('uCorreo').value.trim(),
    Direccion:         document.getElementById('uDireccion').value.trim(),
  };
  const roles = getRolesSeleccionados();

  if (['Cedula','CodigoTrabajador','Nombre','Celular','CorreoElectronico','Direccion'].some(k => !datos[k])) {
    setStatus('modalStatus', 'error', '❌ Completa todos los campos obligatorios (*)');
    return;
  }

  setStatus('modalStatus', 'loading', '<span class="spinner"></span> Guardando...');

  let r;
  if (editandoCedula === null) {
    const contrasena = document.getElementById('uContrasena').value;
    if (!contrasena) { setStatus('modalStatus', 'error', '❌ La contraseña es requerida'); return; }
    datos.Contrasena = contrasena;
    r = await apiFetch(ENDPOINTS.USUARIO.CREATE, { method: 'POST', body: JSON.stringify({ ...datos, roles }) });
  } else {
    r = await apiFetch(ENDPOINTS.USUARIO.UPDATE(editandoCedula), { method: 'PUT', body: JSON.stringify({ ...datos, roles }) });
  }

  if (!r) return;
  const data = await r.json();
  if (r.ok) {
    setStatus('modalStatus', 'ok', '✅ ' + (data.mensaje || 'Guardado correctamente'));
    setTimeout(async () => { cerrarModalUsuario(); await cargarUsuarios(); }, 700);
  } else {
    setStatus('modalStatus', 'error', '❌ ' + (data.error || 'Error al guardar'));
  }
}

// ── Sub-tab: Auditoría Sistema ────────────────────────────────────────────────

function renderSubTabAuditoria(container) {
  container.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <div class="dot" style="background:var(--yellow)"></div>
        Auditoría del Sistema — Últimos 400 registros
      </div>
      <div class="search-wrap">
        <span class="search-icon">🔎</span>
        <input type="text" id="searchAuditoria" placeholder="Buscar acción, trabajador, descripción..."
          oninput="filtrarAuditoria(this.value)" />
      </div>
    </div>

    <div id="auditoriaStatus" class="status-bar status-loading">
      <span class="spinner"></span> Cargando registros de auditoría...
    </div>

    <div class="tabla-wrap">
      <table id="tablaAuditoria" style="display:none;">
        <thead>
          <tr>
            <th>Fecha y Hora</th><th>Acción</th><th>Trabajador</th>
            <th>Tabla</th><th>Resultado</th><th>Descripción</th><th>Dispositivo</th>
          </tr>
        </thead>
        <tbody id="auditoriaBody"></tbody>
      </table>
    </div>
    <p id="auditoriaVacia" style="color:var(--muted); font-size:.85rem; padding:8px 0; display:none;">
      No hay registros de auditoría.
    </p>`;
  cargarAuditoria();
}

async function cargarAuditoria() {
  const statusEl = document.getElementById('auditoriaStatus');
  if (!statusEl) return;
  const r = await apiFetch(ENDPOINTS.USUARIO.AUDITORIA);
  if (!r) return;
  const data = await r.json();
  if (!r.ok) {
    statusEl.className = 'status-bar status-error';
    statusEl.innerHTML = '❌ ' + (data.error || 'Error al cargar la auditoría');
    return;
  }
  auditoriaData = data;
  statusEl.style.display = 'none';
  renderTablaAuditoria(data);
}

function filtrarAuditoria(texto) {
  const q = texto.toLowerCase();
  renderTablaAuditoria(auditoriaData.filter(a =>
    (a.TipoAccion       || '').toLowerCase().includes(q) ||
    (a.NombreTrabajador || '').toLowerCase().includes(q) ||
    (a.CedulaTrabajador || '').toLowerCase().includes(q) ||
    (a.Descripcion      || '').toLowerCase().includes(q) ||
    (a.TablaAfectada    || '').toLowerCase().includes(q) ||
    (a.Resultado        || '').toLowerCase().includes(q)
  ));
}

function _badgeAccionDir(tipo) {
  const map = {
    LOGIN:'badge-green', LOGOUT:'badge-purple', LOGIN_FALLIDO:'badge-red',
    CREAR:'badge-purple', EDITAR:'badge-yellow', ELIMINAR:'badge-red',
    CAMBIO_ESTADO:'badge-orange', CAMBIO_CONTRASENA:'badge-yellow', CONSULTAR:'badge-purple',
  };
  return map[tipo] || 'badge-purple';
}

function _badgeResultadoDir(r) {
  if (r === 'EXITOSO')      return 'badge-green';
  if (r === 'FALLIDO')      return 'badge-red';
  if (r === 'NO_AUTORIZADO')return 'badge-orange';
  return 'badge-purple';
}

function _parsearDispositivo(ua) {
  if (!ua) return '—';
  let os = 'Desconocido', browser = 'Desconocido';
  if (/Windows NT 10|Windows NT 11/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Mac OS X/.test(ua))        os = 'macOS';
  else if (/Android/.test(ua))         os = 'Android';
  else if (/iPhone|iPad/.test(ua))     os = 'iOS';
  else if (/Linux/.test(ua))           os = 'Linux';
  if (/Edg\//.test(ua))          browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua))browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua))  browser = 'Chrome';
  else if (/Safari\//.test(ua))  browser = 'Safari';
  else if (/MSIE|Trident/.test(ua)) browser = 'IE';
  return `${browser} · ${os}`;
}

function _normalizarIP(ip) {
  if (!ip) return '—';
  if (ip === '::1' || ip === '127.0.0.1') return 'localhost';
  return ip;
}

function renderTablaAuditoria(registros) {
  const tabla = document.getElementById('tablaAuditoria');
  const vacia = document.getElementById('auditoriaVacia');
  const body  = document.getElementById('auditoriaBody');
  if (!tabla) return;
  if (!registros.length) {
    tabla.style.display = 'none'; vacia.style.display = 'block'; return;
  }
  tabla.style.display = 'table'; vacia.style.display = 'none';
  body.innerHTML = registros.map(a => `
    <tr>
      <td style="font-family:'JetBrains Mono',monospace; font-size:.75rem; white-space:nowrap; color:var(--muted);">
        ${formatFecha(a.FechaHora)}
      </td>
      <td><span class="badge ${_badgeAccionDir(a.TipoAccion)}" style="font-size:.65rem; white-space:nowrap;">${a.TipoAccion || '—'}</span></td>
      <td>
        <div style="font-size:.83rem; font-weight:600;">${a.NombreTrabajador || '—'}</div>
        <div style="font-size:.72rem; color:var(--muted); font-family:'JetBrains Mono',monospace;">${a.CedulaTrabajador || ''}</div>
      </td>
      <td style="font-size:.8rem; color:var(--muted);">${a.TablaAfectada || '—'}</td>
      <td><span class="badge ${_badgeResultadoDir(a.Resultado)}" style="font-size:.65rem;">${a.Resultado || '—'}</span></td>
      <td style="font-size:.8rem; max-width:260px; color:var(--muted); word-break:break-word;">${a.Descripcion || '—'}</td>
      <td>
        <div style="font-size:.8rem; font-weight:500;">${_parsearDispositivo(a.Dispositivo)}</div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:.68rem; color:var(--muted); margin-top:2px;">${_normalizarIP(a.DireccionIP)}</div>
      </td>
    </tr>`).join('');
}
