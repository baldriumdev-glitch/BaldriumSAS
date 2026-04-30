// ── Módulo Coordinador: Inventario ───────────────────────────────────────────
// Depende de: config.js, auth.js, utils.js

let inventarioData    = [];
let auditoriaInvData  = [];
let editandoInvId     = null;
let eliminandoInvId   = null;

function renderModuloCoordinador(container) {
  container.innerHTML = `
    <div class="card">
      <div class="sub-tabs">
        <button class="sub-tab-btn active" id="subTabProductosBtn"
          onclick="seleccionarSubTabInv('productos', this)">📦 Productos</button>
        <button class="sub-tab-btn" id="subTabAudInvBtn"
          onclick="seleccionarSubTabInv('auditoria', this)">📋 Auditoría Inventario</button>
      </div>
      <div id="subContentInv"></div>
    </div>`;
  seleccionarSubTabInv('productos', document.getElementById('subTabProductosBtn'));
}

function seleccionarSubTabInv(cual, btn) {
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const sc = document.getElementById('subContentInv');
  if (cual === 'productos') renderSubTabProductos(sc);
  else renderSubTabAuditoriaInv(sc);
}

// ── Sub-tab: Productos ────────────────────────────────────────────────────────

function renderSubTabProductos(container) {
  container.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <div class="dot" style="background:var(--accent2)"></div>
        Gestión de Inventario
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <div class="search-wrap">
            <span class="search-icon">🔎</span>
            <input type="text" id="searchInv" placeholder="Buscar nombre, tipo..."
              oninput="filtrarInventario(this.value)" />
          </div>
          <select id="filtroTipoInv" onchange="filtrarInventario(document.getElementById('searchInv').value)"
            style="width:180px; height:36px; padding:6px 12px; font-size:.82rem;">
            <option value="">Todos los tipos</option>
            <option value="Beneficio">Beneficio</option>
            <option value="Inventario de cocina">Inventario de cocina</option>
            <option value="Alimentacion">Alimentacion</option>
          </select>
        </div>
        <button class="btn-add" onclick="abrirModalCrearProducto()">➕ Nuevo Producto</button>
      </div>
    </div>

    <div id="invTablaStatus" class="status-bar status-loading">
      <span class="spinner"></span> Cargando inventario...
    </div>

    <div class="tabla-wrap">
      <table id="tablaInventario" style="display:none;">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Tipo</th><th>Valor unitario</th>
            <th>Cantidad</th><th>Estado Stock</th><th>Última actualización</th>
            <th style="text-align:center;">Acciones</th>
          </tr>
        </thead>
        <tbody id="invTablaBody"></tbody>
      </table>
    </div>
    <p id="invTablaVacia" style="color:var(--muted); font-size:.85rem; padding:8px 0; display:none;">
      No hay productos registrados.
    </p>`;
  cargarInventario();
}

function _badgeStock(cantidad) {
  const n = parseInt(cantidad);
  if (n === 0)  return '<span class="badge badge-stock-none">Sin Stock</span>';
  if (n <= 10)  return '<span class="badge badge-stock-low">Bajo Stock</span>';
  return '<span class="badge badge-stock-ok">Disponible</span>';
}

function _badgeTipoInv(tipo) {
  const map = {
    'Beneficio':           'badge-purple',
    'Inventario de cocina':'badge-yellow',
    'Alimentacion':        'badge-orange',
  };
  return `<span class="badge ${map[tipo] || 'badge-purple'}" style="font-size:.68rem;">${tipo}</span>`;
}

async function cargarInventario() {
  const statusEl = document.getElementById('invTablaStatus');
  if (!statusEl) return;
  const r = await apiFetch(ENDPOINTS.INVENTARIO.LIST);
  if (!r) return;
  const data = await r.json();
  if (!r.ok) {
    statusEl.className = 'status-bar status-error';
    statusEl.innerHTML = '❌ ' + (data.error || 'Error al cargar el inventario');
    return;
  }
  inventarioData = data;
  statusEl.style.display = 'none';
  renderTablaInventario(data);
}

function filtrarInventario(texto) {
  const q    = (texto || '').toLowerCase();
  const tipo = (document.getElementById('filtroTipoInv')?.value || '');
  renderTablaInventario(inventarioData
    .filter(p => (p.Nombre || '').toLowerCase().includes(q) || (p.Tipo || '').toLowerCase().includes(q))
    .filter(p => !tipo || p.Tipo === tipo));
}

function renderTablaInventario(productos) {
  const tabla = document.getElementById('tablaInventario');
  const vacia = document.getElementById('invTablaVacia');
  const body  = document.getElementById('invTablaBody');
  if (!tabla) return;
  if (!productos.length) {
    tabla.style.display = 'none'; vacia.style.display = 'block'; return;
  }
  tabla.style.display = 'table'; vacia.style.display = 'none';
  body.innerHTML = productos.map(p => `
    <tr>
      <td style="font-family:'JetBrains Mono',monospace; font-size:.75rem; color:var(--muted);">#${p.ID}</td>
      <td><strong>${p.Nombre}</strong></td>
      <td>${_badgeTipoInv(p.Tipo)}</td>
      <td style="font-family:'JetBrains Mono',monospace; font-size:.82rem;">${formatMoneda(p.Valor)}</td>
      <td style="font-family:'JetBrains Mono',monospace; font-size:.84rem; font-weight:600;">${p.Cantidad}</td>
      <td>${_badgeStock(p.Cantidad)}</td>
      <td style="font-size:.75rem; color:var(--muted); white-space:nowrap;">${formatFecha(p.FechaActualizacion)}</td>
      <td>
        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
          <button class="action-btn btn-edit"   onclick="abrirModalEditarProducto(${p.ID})">✏️ Editar</button>
          <button class="action-btn btn-delete" onclick="abrirConfirmElim(${p.ID}, '${escHtml(p.Nombre)}')">🗑️ Eliminar</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Modal crear/editar producto ──────────────────────────────────────────────

function abrirModalCrearProducto() {
  editandoInvId = null;
  document.getElementById('invModalIcon').textContent    = '📦';
  document.getElementById('invModalTitulo').textContent  = 'Nuevo Producto';
  document.getElementById('invModalSub').textContent     = 'Completa los campos para registrar un nuevo producto.';
  document.getElementById('invNombre').value        = '';
  document.getElementById('invTipo').value          = '';
  document.getElementById('invValor').value         = '';
  document.getElementById('invCantidad').value      = '';
  document.getElementById('invObservaciones').value = '';
  document.getElementById('invObsGroup').style.display = 'none';
  setStatus('invModalStatus', 'idle', '⏳ Completa los campos requeridos (*)');
  document.getElementById('modalInventario').classList.add('open');
  setTimeout(() => document.getElementById('invNombre').focus(), 80);
}

function abrirModalEditarProducto(id) {
  const p = inventarioData.find(x => x.ID === id);
  if (!p) return;
  editandoInvId = id;
  document.getElementById('invModalIcon').textContent    = '✏️';
  document.getElementById('invModalTitulo').textContent  = 'Editar Producto';
  document.getElementById('invModalSub').textContent     = `Modificando: ${p.Nombre}`;
  document.getElementById('invNombre').value        = p.Nombre;
  document.getElementById('invTipo').value          = p.Tipo;
  document.getElementById('invValor').value         = p.Valor;
  document.getElementById('invCantidad').value      = p.Cantidad;
  document.getElementById('invObservaciones').value = '';
  document.getElementById('invObsGroup').style.display = 'block';
  setStatus('invModalStatus', 'idle', '⏳ Modifica los campos necesarios');
  document.getElementById('modalInventario').classList.add('open');
}

function cerrarModalInventario() { document.getElementById('modalInventario').classList.remove('open'); }
function cerrarModalInvSiOverlay(e) { if (e.target === document.getElementById('modalInventario')) cerrarModalInventario(); }

async function guardarProducto() {
  const datos = {
    Nombre:        document.getElementById('invNombre').value.trim(),
    Tipo:          document.getElementById('invTipo').value,
    Valor:         document.getElementById('invValor').value,
    Cantidad:      document.getElementById('invCantidad').value,
    observaciones: document.getElementById('invObservaciones').value.trim() || null,
  };
  if (!datos.Nombre || !datos.Tipo || datos.Valor === '' || datos.Cantidad === '') {
    setStatus('invModalStatus', 'error', '❌ Completa todos los campos obligatorios (*)');
    return;
  }
  setStatus('invModalStatus', 'loading', '<span class="spinner"></span> Guardando...');
  const r = editandoInvId === null
    ? await apiFetch(ENDPOINTS.INVENTARIO.CREATE, { method: 'POST', body: JSON.stringify(datos) })
    : await apiFetch(ENDPOINTS.INVENTARIO.UPDATE(editandoInvId), { method: 'PUT', body: JSON.stringify(datos) });
  if (!r) return;
  const data = await r.json();
  if (r.ok) {
    setStatus('invModalStatus', 'ok', '✅ ' + (data.mensaje || 'Guardado correctamente'));
    setTimeout(async () => { cerrarModalInventario(); await cargarInventario(); }, 700);
  } else {
    setStatus('invModalStatus', 'error', '❌ ' + (data.error || 'Error al guardar'));
  }
}

// ── Modal confirmar eliminación ──────────────────────────────────────────────

function abrirConfirmElim(id, nombre) {
  eliminandoInvId = id;
  document.getElementById('confirmElimTexto').textContent =
    `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`;
  setStatus('confirmElimStatus', 'idle', '⚠️ Esta acción es irreversible');
  document.getElementById('modalConfirmarElim').classList.add('open');
}

function cerrarConfirmElim() { document.getElementById('modalConfirmarElim').classList.remove('open'); }
function cerrarConfirmElimSiOverlay(e) { if (e.target === document.getElementById('modalConfirmarElim')) cerrarConfirmElim(); }

async function confirmarEliminar() {
  if (!eliminandoInvId) return;
  setStatus('confirmElimStatus', 'loading', '<span class="spinner"></span> Eliminando...');
  const r = await apiFetch(ENDPOINTS.INVENTARIO.DELETE(eliminandoInvId), { method: 'DELETE' });
  if (!r) return;
  const data = await r.json();
  if (r.ok) {
    setStatus('confirmElimStatus', 'ok', '✅ ' + data.mensaje);
    setTimeout(async () => { cerrarConfirmElim(); await cargarInventario(); }, 700);
  } else {
    setStatus('confirmElimStatus', 'error', '❌ ' + (data.error || 'No se pudo eliminar'));
  }
}

// ── Sub-tab: Auditoría Inventario ────────────────────────────────────────────

function renderSubTabAuditoriaInv(container) {
  container.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <div class="dot" style="background:var(--yellow)"></div>
        Auditoría de Inventario — Últimos 400 movimientos
      </div>
      <div class="search-wrap">
        <span class="search-icon">🔎</span>
        <input type="text" id="searchAudInv" placeholder="Buscar producto, responsable, motivo..."
          oninput="filtrarAuditoriaInv(this.value)" />
      </div>
    </div>

    <div id="audInvStatus" class="status-bar status-loading">
      <span class="spinner"></span> Cargando auditoría de inventario...
    </div>

    <div class="tabla-wrap">
      <table id="tablaAudInv" style="display:none;">
        <thead>
          <tr>
            <th>Fecha y Hora</th><th>Tipo</th>
            <th>Producto / Descripción</th><th>Detalle</th><th>Responsable</th>
          </tr>
        </thead>
        <tbody id="audInvBody"></tbody>
      </table>
    </div>
    <p id="audInvVacia" style="color:var(--muted); font-size:.85rem; padding:8px 0; display:none;">
      No hay registros de auditoría de inventario.
    </p>`;
  cargarAuditoriaInv();
}

async function cargarAuditoriaInv() {
  const statusEl = document.getElementById('audInvStatus');
  if (!statusEl) return;

  const [r1, r2] = await Promise.all([
    apiFetch(ENDPOINTS.INVENTARIO.AUDITORIA),
    apiFetch(ENDPOINTS.INVENTARIO.AUDITORIA_INFO),
  ]);

  if (!r1) return;
  if (!r1.ok) {
    const d = await r1.json();
    statusEl.className = 'status-bar status-error';
    statusEl.innerHTML = '❌ ' + (d.error || 'Error al cargar auditoría');
    return;
  }

  const movimientos = (await r1.json()).map(r => ({ ...r, _fuente: 'MOVIMIENTO' }));
  const infoCambios = (r2 && r2.ok) ? (await r2.json()).map(r => ({ ...r, _fuente: 'INFO' })) : [];

  auditoriaInvData = [...movimientos, ...infoCambios]
    .sort((a, b) => new Date(b.FechaHora) - new Date(a.FechaHora));

  statusEl.style.display = 'none';
  renderTablaAuditoriaInv(auditoriaInvData);
}

function filtrarAuditoriaInv(texto) {
  const q = texto.toLowerCase();
  renderTablaAuditoriaInv(auditoriaInvData.filter(a =>
    (a.NombreProducto    || '').toLowerCase().includes(q) ||
    (a.NombreResponsable || '').toLowerCase().includes(q) ||
    (a.Motivo            || '').toLowerCase().includes(q) ||
    (a.TipoMovimiento    || '').toLowerCase().includes(q) ||
    (a.TipoAccion        || '').toLowerCase().includes(q) ||
    (a.Observaciones     || '').toLowerCase().includes(q) ||
    (a.Descripcion       || '').toLowerCase().includes(q)
  ));
}

function _parsearCambiosInv(valorAnterior, valorNuevo) {
  try {
    const ant = typeof valorAnterior === 'string' ? JSON.parse(valorAnterior) : (valorAnterior || {});
    const nvo = typeof valorNuevo    === 'string' ? JSON.parse(valorNuevo)    : (valorNuevo   || {});
    const labels = { Nombre:'Nombre', Tipo:'Tipo', Valor:'Precio', Cantidad:'Cantidad' };
    const keys = new Set([...Object.keys(ant), ...Object.keys(nvo)]);
    const diffs = [];
    for (const k of keys) {
      if (String(ant[k]) !== String(nvo[k])) {
        const label  = labels[k] || k;
        const antVal = k === 'Valor' ? formatMoneda(ant[k]) : `"${ant[k]}"`;
        const nvoVal = k === 'Valor' ? formatMoneda(nvo[k]) : `"${nvo[k]}"`;
        diffs.push(
          `<span style="font-size:.75rem;font-weight:600;color:var(--muted)">${label}:</span> ` +
          `<span style="color:var(--red)">${antVal}</span>` +
          ` <span style="color:var(--muted)">→</span> ` +
          `<span style="color:var(--green);font-weight:600">${nvoVal}</span>`
        );
      }
    }
    return diffs.length ? diffs.join('<br>') : '—';
  } catch { return '—'; }
}

function _badgeAccionInv(tipo) {
  const map = { CREAR:'badge-green', EDITAR:'badge-yellow', ELIMINAR:'badge-red' };
  return `<span class="badge ${map[tipo] || 'badge-purple'}" style="font-size:.65rem;">${tipo || '—'}</span>`;
}

function _badgeMovimiento(tipo) {
  return tipo === 'ENTRADA'
    ? '<span class="badge badge-green" style="font-size:.65rem;">▲ ENTRADA</span>'
    : '<span class="badge badge-red"   style="font-size:.65rem;">▼ SALIDA</span>';
}

function renderTablaAuditoriaInv(registros) {
  const tabla = document.getElementById('tablaAudInv');
  const vacia = document.getElementById('audInvVacia');
  const body  = document.getElementById('audInvBody');
  if (!tabla) return;
  if (!registros.length) {
    tabla.style.display = 'none'; vacia.style.display = 'block'; return;
  }
  tabla.style.display = 'table'; vacia.style.display = 'none';
  body.innerHTML = registros.map(a => {
    const fecha = `<td style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted);white-space:nowrap">${formatFecha(a.FechaHora)}</td>`;
    const responsable = `<td>
      <div style="font-size:.82rem;font-weight:600">${a.NombreResponsable || '—'}</div>
      <div style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${a.CedulaResponsable || ''}</div>
    </td>`;

    if (a._fuente === 'MOVIMIENTO') {
      const signo = a.TipoMovimiento === 'ENTRADA' ? '+' : '-';
      const color = a.TipoMovimiento === 'ENTRADA' ? 'var(--green)' : 'var(--red)';
      const detalle = `
        <div style="font-size:.8rem">
          Stock:
          <span style="font-family:'JetBrains Mono',monospace;color:var(--muted)">${a.CantidadAnterior}</span>
          <span style="color:${color};font-weight:700;margin:0 4px">${signo}${a.CantidadMovimiento}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700">→ ${a.CantidadPosterior}</span>
        </div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:3px">
          ${formatMoneda(a.ValorUnitario)} · ${a.Motivo || '—'}
          ${a.Observaciones ? `<br>${a.Observaciones}` : ''}
        </div>`;
      return `<tr>
        ${fecha}
        <td>${_badgeMovimiento(a.TipoMovimiento)}</td>
        <td>
          <div style="font-size:.83rem;font-weight:600">${a.NombreProducto || '—'}</div>
          <div style="font-size:.7rem;color:var(--muted)">ID: ${a.InventarioID}</div>
        </td>
        <td>${detalle}</td>
        ${responsable}
      </tr>`;
    } else {
      const detalle = _parsearCambiosInv(a.ValorAnterior, a.ValorNuevo);
      return `<tr style="background:rgba(108,99,255,.04)">
        ${fecha}
        <td>${_badgeAccionInv(a.TipoAccion)}</td>
        <td style="font-size:.8rem;color:var(--muted)">${a.Descripcion || '—'}</td>
        <td style="font-size:.8rem;line-height:1.7">${detalle}</td>
        ${responsable}
      </tr>`;
    }
  }).join('');
}
