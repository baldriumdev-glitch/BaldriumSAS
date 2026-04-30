// ── Módulo Asesor Comercial: Visitas y Compras (Telemercadeo) ─────────────────
// Depende de: config.js, auth.js, utils.js

// ── Helpers de badge ─────────────────────────────────────────────────────────

const _estadoStyle = {
  'Visitado':   ['var(--green)',  '#052e16'],
  'Pendiente':  ['var(--yellow)', '#1c1200'],
  'No contesta':['#f97316',       '#1a0900'],
  'Rechaza':    ['var(--red)',    '#1f0000'],
};

function badgeVisita(estado) {
  const [bg, color] = _estadoStyle[estado] || ['var(--muted)', '#000'];
  return `<span style="background:${bg};color:${color};padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:600">${estado || '—'}</span>`;
}

function badgeVisitaBtn(estado, visitaId) {
  const [bg, color] = _estadoStyle[estado] || ['var(--surface2)', 'var(--muted)'];
  return `<button onclick="abrirCambiarEstado(${visitaId},'${estado}')"
    style="background:${bg};color:${color};border:none;padding:3px 12px;border-radius:20px;
           font-size:.75rem;font-weight:600;cursor:pointer;transition:opacity .15s"
    onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
    ${estado || 'Sin estado'} &#9660;
  </button>`;
}

function _badgeEstadoCompra(estado) {
  const map = {
    'Pendiente': ['var(--yellow)', '#000'],
    'Completada':['var(--green)',  '#000'],
    'Cancelada': ['var(--red)',    '#fff'],
  };
  const [bg, color] = map[estado] || ['var(--surface2)', 'var(--muted)'];
  return `<span style="background:${bg};color:${color};padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:600">${estado || '—'}</span>`;
}

function _badgeBeneficio(estado) {
  if (estado === 'Aceptado') {
    return `<span style="color:var(--green);font-size:1.2rem;font-weight:700" title="Aceptado">✓</span>`;
  }
  const label = estado
    ? `<span style="font-size:.72rem;color:var(--muted);margin-left:4px">${estado}</span>`
    : `<span style="font-size:.72rem;color:var(--muted);margin-left:4px">Sin beneficio</span>`;
  return `<span style="color:var(--red);font-size:1.2rem;font-weight:700" title="${estado || 'Sin beneficio'}">✗</span>${label}`;
}

// ── Helpers de filas ──────────────────────────────────────────────────────────

function filaVisita(v, editable = false) {
  return `<tr>
    <td>${fmtFecha(v.FechaVisita)}</td>
    <td>${v.NombrePersona || '—'}</td>
    <td><span style="font-size:.75rem;color:var(--muted)">${v.TipoPersona || '—'}</span></td>
    <td>${v.Celular || '—'}</td>
    <td style="max-width:180px;font-size:.8rem">${v.Direccion || '—'}</td>
    <td style="text-align:center">${v.CantidadPersonas ?? '—'}</td>
    <td style="text-align:center;font-size:.78rem;color:var(--muted)">
      ${v.UltimaInteraccion ? fmtFechaHora(v.UltimaInteraccion) : '<span style="color:var(--muted)">N/A</span>'}
    </td>
    <td style="text-align:center" id="estadoCell_${v.ID}">
      ${editable ? badgeVisitaBtn(v.Estado, v.ID) : badgeVisita(v.Estado)}
    </td>
    <td style="max-width:200px;font-size:.8rem;color:var(--muted)" title="${(v.Notas || '').replace(/"/g,'&quot;')}">
      ${v.Notas ? `<span style="color:var(--text)">${v.Notas.length > 50 ? v.Notas.slice(0,50)+'…' : v.Notas}</span>` : '<span style="color:var(--muted);font-style:italic">Sin notas</span>'}
    </td>
    <td style="text-align:center;white-space:nowrap">
      <button class="btn-detalle" onclick="abrirDetallePersona(${v.PersonaID},'${(v.NombrePersona||'').replace(/'/g,"\\'")}','${v.TipoPersona}')">
        Ver detalles
      </button>
      <button class="btn-detalle" style="margin-left:6px;border-color:var(--green);color:var(--green)"
        onclick="abrirNuevaCompra(${v.PersonaID},'${v.TipoPersona}','${String(v.NombrePersona||'').replace(/'/g,"\\'")}','${String(v.Celular||'').replace(/'/g,"\\'")}','${String(v.Direccion||'').replace(/'/g,"\\'")}')">
        Comprar
      </button>
    </td>
  </tr>`;
}

function filaCompra(c) {
  return `<tr>
    <td style="font-size:.88rem">${c.NombreCliente || '—'}</td>
    <td style="font-size:.8rem;color:var(--muted);max-width:180px">${c.Productos || '—'}</td>
    <td style="white-space:nowrap;font-size:.85rem">${fmtFecha(c.FechaCompra)}</td>
    <td style="text-align:right;font-weight:600;color:var(--green);white-space:nowrap">
      $${Number(c.TotalCompra).toLocaleString('es-CO')}
    </td>
    <td style="text-align:center">${_badgeEstadoCompra(c.EstadoCompra)}</td>
    <td style="text-align:center">${_badgeBeneficio(c.EstadoBeneficio)}</td>
    <td style="font-size:.82rem;color:var(--muted)">${c.FormaPago?.replace(/_/g,' ') || '—'}</td>
  </tr>`;
}

function tablaVisitasHTML(idTabla, idVacia) {
  return `
    <div class="tabla-wrap">
      <table id="${idTabla}" style="display:none">
        <thead><tr>
          <th>Fecha</th><th>Persona</th><th>Tipo</th>
          <th>Celular</th><th>Dirección</th>
          <th style="text-align:center">Personas</th>
          <th style="text-align:center">Últ. interacción</th>
          <th style="text-align:center">Estado</th>
          <th>Notas</th>
          <th style="text-align:center">Acciones</th>
        </tr></thead>
        <tbody id="${idTabla}Body"></tbody>
      </table>
    </div>
    <p id="${idVacia}" style="color:var(--muted);font-size:.85rem;padding:8px 0;display:none">
      No hay visitas registradas.
    </p>`;
}

function tablaComprasHTML(idTabla, idVacia) {
  return `
    <div class="tabla-wrap">
      <table id="${idTabla}" style="display:none">
        <thead><tr>
          <th>Cliente</th><th>Producto</th><th>Fecha</th>
          <th style="text-align:right">Valor</th>
          <th style="text-align:center">Estado</th>
          <th style="text-align:center">Beneficio</th>
          <th>Forma de pago</th>
        </tr></thead>
        <tbody id="${idTabla}Body"></tbody>
      </table>
    </div>
    <p id="${idVacia}" style="color:var(--muted);font-size:.85rem;padding:8px 0;display:none">
      No hay compras registradas.
    </p>`;
}

function llenarTabla(idTabla, idVacia, visitas, editable = false) {
  const tbody = document.getElementById(idTabla + 'Body');
  const tabla = document.getElementById(idTabla);
  const vacia = document.getElementById(idVacia);
  if (!tbody) return;
  if (!visitas || visitas.length === 0) {
    tabla.style.display = 'none'; vacia.style.display = 'block';
  } else {
    tabla.style.display = ''; vacia.style.display = 'none';
    tbody.innerHTML = visitas.map(v => filaVisita(v, editable)).join('');
  }
}

function _llenarTablaCompras(idTabla, idVacia, compras) {
  const tabla = document.getElementById(idTabla);
  const vacia = document.getElementById(idVacia);
  const tbody = document.getElementById(idTabla + 'Body');
  if (!tabla) return;
  if (!compras || compras.length === 0) {
    tabla.style.display = 'none'; vacia.style.display = 'block';
  } else {
    tabla.style.display = ''; vacia.style.display = 'none';
    tbody.innerHTML = compras.map(filaCompra).join('');
  }
}

// ── Render principal del módulo ───────────────────────────────────────────────

function renderModuloAsesorComercial(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div id="kpiVisitas" style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="kpi-card">
          <div class="kpi-label">Visitas por hacer esta semana</div>
          <div class="kpi-val" id="kpiPersonasVal">—</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Visitas de la semana confirmadas (Visitado)</div>
          <div class="kpi-val" id="kpiConfirmadasVal">—</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Visitas no efectivas (No contesta + Rechaza)</div>
          <div class="kpi-val" id="kpiNoEfectivasVal" style="color:var(--red)">—</div>
        </div>
      </div>
      <div id="kpiCompras" style="display:none;gap:16px;flex-wrap:wrap">
        <div class="kpi-card">
          <div class="kpi-label">Número de ventas del mes</div>
          <div class="kpi-val" id="kpiNumVentasVal">—</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Valor ventas completadas del mes</div>
          <div class="kpi-val" id="kpiValorVentasVal" style="color:var(--green)">—</div>
        </div>
      </div>
      <button onclick="abrirVentaLibre()"
        style="display:flex;align-items:center;gap:8px;background:var(--accent);color:#fff;
          border:none;border-radius:var(--radius);padding:10px 20px;font-size:.88rem;
          font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .15s"
        onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        ＋ Nueva venta
      </button>
    </div>

    <div class="sub-tabs" style="margin-bottom:20px">
      <button class="sub-tab-btn active" id="asesorSubTabVisitasBtn"
        onclick="_asesorTab('visitas')">Visitas</button>
      <button class="sub-tab-btn" id="asesorSubTabComprasBtn"
        onclick="_asesorTab('compras')">Mis Compras</button>
    </div>

    <div id="asesorTabVisitas">
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="margin-bottom:10px">
          <div class="card-title"><div class="dot" style="background:var(--green)"></div>Buscar visita</div>
          <div class="search-wrap">
            <span class="search-icon">🔎</span>
            <input type="text" id="buscarVisitaInput"
              placeholder="Nombre, fecha (dd/mm/yyyy) o estado..."
              oninput="buscarVisita(this.value)" style="width:280px" />
          </div>
        </div>
        <div id="buscarStatus" style="color:var(--muted);font-size:.85rem;padding:4px 0">
          Escribe para buscar en todas tus visitas.
        </div>
        ${tablaVisitasHTML('tablaBuscar', 'buscarVacia')}
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="margin-bottom:12px">
          <div class="card-title"><div class="dot" style="background:var(--accent2)"></div>Visitas de la semana</div>
        </div>
        <div id="semanaStatus" class="status-bar status-loading">
          <span class="spinner"></span> Cargando visitas...
        </div>
        ${tablaVisitasHTML('tablaSemana', 'semanaVacia')}
      </div>

      <div class="card">
        <div class="card-header" style="margin-bottom:12px">
          <div class="card-title"><div class="dot" style="background:var(--accent)"></div>Visitas del mes</div>
        </div>
        <div id="mesStatus" class="status-bar status-loading">
          <span class="spinner"></span> Cargando visitas...
        </div>
        ${tablaVisitasHTML('tablaMes', 'mesVacia')}
      </div>
    </div>

    <div id="asesorTabCompras" style="display:none">
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="margin-bottom:12px">
          <div class="card-title"><div class="dot" style="background:var(--accent2)"></div>Compras de la semana</div>
        </div>
        <div id="comprasSemanaStatus" class="status-bar status-loading"><span class="spinner"></span> Cargando...</div>
        ${tablaComprasHTML('tablaComprasSemana', 'comprasSemanaVacia')}
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="margin-bottom:12px">
          <div class="card-title"><div class="dot" style="background:var(--accent)"></div>Compras del mes</div>
        </div>
        <div id="comprasMesStatus" class="status-bar status-loading"><span class="spinner"></span> Cargando...</div>
        ${tablaComprasHTML('tablaComprasMes', 'comprasMesVacia')}
      </div>

      <div class="card">
        <div class="card-header" style="margin-bottom:10px">
          <div class="card-title"><div class="dot" style="background:var(--green)"></div>Buscar compra</div>
          <div class="search-wrap">
            <span class="search-icon">🔎</span>
            <input type="text" id="buscarCompraInput"
              placeholder="Cliente, producto, fecha o estado..."
              oninput="buscarCompra(this.value)" style="width:280px" />
          </div>
        </div>
        <div id="buscarCompraStatus" style="color:var(--muted);font-size:.85rem;padding:4px 0">
          Escribe para buscar en todas tus compras.
        </div>
        ${tablaComprasHTML('tablaComprasBuscar', 'comprasBuscarVacia')}
      </div>
    </div>`;

  cargarDatosAsesor();
}

// ── Carga de datos ────────────────────────────────────────────────────────────

async function cargarDatosAsesor() {
  _comprasCargadas = false;
  const [rSemana, rMes] = await Promise.all([
    apiFetch(ENDPOINTS.TELEMERCADEO.VISITAS_SEMANA),
    apiFetch(ENDPOINTS.TELEMERCADEO.VISITAS_MES),
  ]);

  const semanaStatus = document.getElementById('semanaStatus');
  if (!rSemana || !rSemana.ok) {
    if (semanaStatus) { semanaStatus.className = 'status-bar status-error'; semanaStatus.textContent = '❌ Error al cargar'; }
  } else {
    const { visitas, kpi } = await rSemana.json();
    if (semanaStatus) semanaStatus.style.display = 'none';
    document.getElementById('kpiPersonasVal').textContent    = kpi?.TotalVisitas      ?? 0;
    document.getElementById('kpiConfirmadasVal').textContent = kpi?.VisitasConfirmadas ?? 0;
    document.getElementById('kpiNoEfectivasVal').textContent = kpi?.VisitasNoEfectivas ?? 0;
    llenarTabla('tablaSemana', 'semanaVacia', visitas, true);
  }

  const mesStatus = document.getElementById('mesStatus');
  if (!rMes || !rMes.ok) {
    if (mesStatus) { mesStatus.className = 'status-bar status-error'; mesStatus.textContent = '❌ Error al cargar'; }
  } else {
    const visitas = await rMes.json();
    if (mesStatus) mesStatus.style.display = 'none';
    llenarTabla('tablaMes', 'mesVacia', visitas, true);
  }
}

let _comprasCargadas = false;

function _asesorTab(tab) {
  document.getElementById('asesorTabVisitas').style.display = tab === 'visitas' ? '' : 'none';
  document.getElementById('asesorTabCompras').style.display = tab === 'compras' ? '' : 'none';
  document.getElementById('kpiVisitas').style.display       = tab === 'visitas' ? 'flex' : 'none';
  document.getElementById('kpiCompras').style.display       = tab === 'compras' ? 'flex' : 'none';
  document.getElementById('asesorSubTabVisitasBtn').classList.toggle('active', tab === 'visitas');
  document.getElementById('asesorSubTabComprasBtn').classList.toggle('active', tab === 'compras');
  if (tab === 'compras' && !_comprasCargadas) cargarMisCompras();
  if (tab === 'compras') {
    const inp = document.getElementById('buscarCompraInput');
    if (inp) inp.value = '';
    _llenarTablaCompras('tablaComprasBuscar', 'comprasBuscarVacia', []);
    const st = document.getElementById('buscarCompraStatus');
    if (st) { st.style.display = 'block'; st.textContent = 'Escribe para buscar en todas tus compras.'; }
  }
}

function _setComprasStatus(id, tipo, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (tipo === 'hide') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.className = `status-bar status-${tipo}`;
  el.innerHTML = msg;
}

async function cargarMisCompras() {
  _comprasCargadas = true;
  const [rSemana, rMes, rKpi] = await Promise.all([
    apiFetch(ENDPOINTS.TELEMERCADEO.COMPRAS_SEMANA),
    apiFetch(ENDPOINTS.TELEMERCADEO.COMPRAS_MES),
    apiFetch(ENDPOINTS.TELEMERCADEO.COMPRAS_KPI_MES),
  ]);

  if (rKpi && rKpi.ok) {
    const kpi = await rKpi.json();
    document.getElementById('kpiNumVentasVal').textContent  = kpi?.NumeroVentas ?? 0;
    document.getElementById('kpiValorVentasVal').textContent =
      '$' + Number(kpi?.ValorVentasConfirmadas ?? 0).toLocaleString('es-CO');
  }

  if (!rSemana || !rSemana.ok) {
    _setComprasStatus('comprasSemanaStatus', 'error', '❌ Error al cargar');
  } else {
    _setComprasStatus('comprasSemanaStatus', 'hide', '');
    _llenarTablaCompras('tablaComprasSemana', 'comprasSemanaVacia', await rSemana.json());
  }

  if (!rMes || !rMes.ok) {
    _setComprasStatus('comprasMesStatus', 'error', '❌ Error al cargar');
  } else {
    _setComprasStatus('comprasMesStatus', 'hide', '');
    _llenarTablaCompras('tablaComprasMes', 'comprasMesVacia', await rMes.json());
  }
}

// ── Búsqueda ──────────────────────────────────────────────────────────────────

let _buscarTimer = null;
async function buscarVisita(q) {
  clearTimeout(_buscarTimer);
  const buscarStatus = document.getElementById('buscarStatus');
  if (!q.trim()) {
    llenarTabla('tablaBuscar', 'buscarVacia', []);
    if (buscarStatus) { buscarStatus.style.display = 'block'; buscarStatus.textContent = 'Escribe para buscar en todas tus visitas.'; }
    return;
  }
  _buscarTimer = setTimeout(async () => {
    if (buscarStatus) { buscarStatus.style.display = 'block'; buscarStatus.textContent = 'Buscando...'; }
    const r = await apiFetch(ENDPOINTS.TELEMERCADEO.VISITAS_BUSCAR(q));
    if (!r || !r.ok) { if (buscarStatus) buscarStatus.textContent = '❌ Error al buscar'; return; }
    const visitas = await r.json();
    if (buscarStatus) buscarStatus.style.display = 'none';
    llenarTabla('tablaBuscar', 'buscarVacia', visitas, true);
    if (visitas.length === 0 && buscarStatus) { buscarStatus.style.display = 'block'; buscarStatus.textContent = 'Sin resultados.'; }
  }, 350);
}

let _buscarCompraTimer = null;
async function buscarCompra(q) {
  clearTimeout(_buscarCompraTimer);
  const statusEl = document.getElementById('buscarCompraStatus');
  if (!q.trim()) {
    _llenarTablaCompras('tablaComprasBuscar', 'comprasBuscarVacia', []);
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Escribe para buscar en todas tus compras.'; }
    return;
  }
  _buscarCompraTimer = setTimeout(async () => {
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Buscando...'; }
    const r = await apiFetch(ENDPOINTS.TELEMERCADEO.COMPRAS_BUSCAR(q));
    if (!r || !r.ok) { if (statusEl) statusEl.textContent = '❌ Error al buscar'; return; }
    const compras = await r.json();
    if (statusEl) statusEl.style.display = 'none';
    _llenarTablaCompras('tablaComprasBuscar', 'comprasBuscarVacia', compras);
    if (compras.length === 0 && statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Sin resultados.'; }
  }, 350);
}

// ── Modal: Cambiar estado de visita ───────────────────────────────────────────

let _cambiarEstadoCtx = { visitaId: null, estadoNuevo: null };

function cerrarCambiarEstado() { document.getElementById('modalCambiarEstado').classList.remove('open'); }
function cerrarCambiarEstadoSiOverlay(e) { if (e.target === document.getElementById('modalCambiarEstado')) cerrarCambiarEstado(); }

function abrirCambiarEstado(visitaId, estadoActual) {
  _cambiarEstadoCtx = { visitaId, estadoNuevo: null };
  document.getElementById('estadoActualLabel').textContent = estadoActual || 'Sin estado';
  document.getElementById('cambiarEstadoStatus').innerHTML = '';
  document.getElementById('cambiarEstadoNotas').value = '';
  document.getElementById('seccionAlimentacion').style.display = 'none';
  document.getElementById('alimentacionOpciones').innerHTML = '';
  document.getElementById('alimentacionBuscar').value = '';

  const estados = ['Pendiente', 'Visitado', 'No contesta', 'Rechaza'];
  document.getElementById('estadoOpciones').innerHTML = estados.map(e => {
    const [bg, color] = _estadoStyle[e] || ['var(--surface2)', 'var(--text)'];
    const esActual = e === estadoActual;
    return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;
      padding:10px 14px;border-radius:8px;border:1px solid ${esActual ? bg : 'var(--border)'};
      background:${esActual ? bg + '22' : 'transparent'};transition:background .15s"
      onmouseover="this.style.background='${bg}22'" onmouseout="this.style.background='${esActual ? bg+'22' : 'transparent'}'">
      <input type="radio" name="nuevoEstado" value="${e}" ${esActual ? 'checked' : ''}
        onchange="_seleccionarEstado('${e}')" style="accent-color:${bg}"/>
      <span style="background:${bg};color:${color};padding:2px 12px;border-radius:20px;font-size:.78rem;font-weight:600">${e}</span>
      ${esActual ? '<span style="color:var(--muted);font-size:.75rem;margin-left:auto">actual</span>' : ''}
    </label>`;
  }).join('');

  document.getElementById('modalCambiarEstado').classList.add('open');
}

function _filtrarAlimentacion(q) {
  const texto = q.toLowerCase().trim();
  document.querySelectorAll('#alimentacionOpciones > div').forEach(div => {
    const nombre = div.querySelector('span')?.textContent.toLowerCase() || '';
    div.style.display = nombre.includes(texto) ? '' : 'none';
  });
}

function _seleccionarEstado(estado) {
  _cambiarEstadoCtx.estadoNuevo = estado;
  if (estado === 'Visitado') {
    _mostrarAlimentacion();
  } else {
    document.getElementById('seccionAlimentacion').style.display = 'none';
    document.getElementById('alimentacionBuscar').value = '';
  }
}

async function _mostrarAlimentacion() {
  const sec  = document.getElementById('seccionAlimentacion');
  const cont = document.getElementById('alimentacionOpciones');
  sec.style.display = 'block';
  cont.innerHTML = '<span style="color:var(--muted);font-size:.82rem">Cargando...</span>';
  const resp = await apiFetch(ENDPOINTS.TELEMERCADEO.VISITAS_ALIMENTACION);
  if (!resp || !resp.ok) {
    cont.innerHTML = '<span style="color:var(--muted);font-size:.82rem">Error al cargar productos</span>';
    return;
  }
  const items = await resp.json();
  if (!items || items.length === 0) {
    cont.innerHTML = '<span style="color:var(--muted);font-size:.82rem">No hay productos de alimentación disponibles</span>';
    return;
  }
  cont.innerHTML = items.map(item => `
    <div style="display:flex;align-items:center;gap:10px;
      padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:transparent">
      <input type="checkbox" name="alimentacionItem" value="${item.ID}"
        style="accent-color:var(--green);width:15px;height:15px;flex-shrink:0;cursor:pointer"
        onchange="const n=this.closest('div').querySelector('input[type=number]');n.disabled=!this.checked;n.style.opacity=this.checked?'1':'.4'"/>
      <span style="font-size:.85rem;flex:1">${item.Nombre}</span>
      <span style="color:var(--muted);font-size:.75rem;white-space:nowrap">Stock: ${item.Cantidad}</span>
      <input type="number" name="alimentacionCantidad" data-id="${item.ID}"
        value="1" min="1" max="${item.Cantidad}" disabled
        style="width:56px;padding:3px 6px;border-radius:6px;border:1px solid var(--border);
          background:var(--surface2);color:var(--text);font-size:.82rem;text-align:center;opacity:.4"/>
    </div>`).join('');
}

async function confirmarCambioEstado() {
  const { visitaId } = _cambiarEstadoCtx;
  const sel    = document.querySelector('input[name="nuevoEstado"]:checked');
  const estado = sel?.value;
  if (!estado) return;

  const suplementos = estado === 'Visitado'
    ? [...document.querySelectorAll('input[name="alimentacionItem"]:checked')].map(cb => ({
        inventarioId: Number(cb.value),
        cantidad: Number(document.querySelector(`input[name="alimentacionCantidad"][data-id="${cb.value}"]`)?.value || 1),
      }))
    : [];

  const notas = document.getElementById('cambiarEstadoNotas').value.trim();
  if (!notas) { setStatus('cambiarEstadoStatus', 'error', '❌ Las notas son obligatorias'); return; }

  const btn = document.getElementById('btnConfirmarEstado');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const r = await apiFetch(ENDPOINTS.TELEMERCADEO.VISITAS_ESTADO, {
    method: 'POST',
    body: JSON.stringify({ visitaId, estado, suplementos, notas }),
  });

  btn.disabled = false; btn.textContent = 'Confirmar';

  if (!r || !r.ok) {
    const datos = await r?.json().catch(() => ({}));
    setStatus('cambiarEstadoStatus', 'error', `❌ ${datos?.error || 'Error al cambiar estado'}`);
    return;
  }

  cerrarCambiarEstado();
  await cargarDatosAsesor();
}

// ── Modal: Detalle de persona ─────────────────────────────────────────────────

function cerrarDetallePersona() { document.getElementById('modalDetallePersona').classList.remove('open'); }
function cerrarDetallePersonaSiOverlay(e) { if (e.target === document.getElementById('modalDetallePersona')) cerrarDetallePersona(); }

async function abrirDetallePersona(personaId, nombre, tipo) {
  const modal = document.getElementById('modalDetallePersona');
  document.getElementById('detallePersonaTitulo').textContent = nombre || 'Detalle';
  document.getElementById('detalleContactoSection').innerHTML =
    '<div class="status-bar status-loading"><span class="spinner"></span> Cargando...</div>';
  document.getElementById('detalleComprasSection').style.display = 'none';
  document.getElementById('detalleComprasTabla').style.display   = 'none';
  document.getElementById('detalleComprasVacia').style.display   = 'none';
  document.getElementById('detalleVisitasTabla').style.display   = 'none';
  document.getElementById('detalleVisitasVacia').style.display   = 'none';
  modal.classList.add('open');

  const [rDetalle, rVisitas] = await Promise.all([
    apiFetch(ENDPOINTS.TELEMERCADEO.PERSONA_DETALLE(personaId)),
    apiFetch(ENDPOINTS.TELEMERCADEO.PERSONA_VISITAS(personaId)),
  ]);

  if (rDetalle && rDetalle.ok) {
    document.getElementById('detalleContactoSection').innerHTML = _renderContacto(await rDetalle.json());
  } else {
    document.getElementById('detalleContactoSection').innerHTML = '<p style="color:var(--red);font-size:.85rem">Error al cargar contacto.</p>';
  }

  if (tipo === 'Cliente') {
    document.getElementById('detalleComprasSection').style.display = 'block';
    const rCompras = await apiFetch(ENDPOINTS.TELEMERCADEO.PERSONA_COMPRAS(personaId));
    if (rCompras && rCompras.ok) {
      const compras = await rCompras.json();
      const tbody = document.getElementById('detalleComprasBody');
      const tabla = document.getElementById('detalleComprasTabla');
      const vacia = document.getElementById('detalleComprasVacia');
      if (!compras.length) {
        vacia.style.display = 'block';
      } else {
        tabla.style.display = '';
        tbody.innerHTML = compras.map(c => `<tr>
          <td>#${c.ID}</td>
          <td>${c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString('es-CO') : '—'}</td>
          <td>${_renderProductosPills(c.Productos)}</td>
          <td style="text-align:right;font-weight:600;color:var(--green)">$${Number(c.TotalCompra||0).toLocaleString('es-CO')}</td>
          <td>${c.EstadoCompra || '—'}</td>
        </tr>`).join('');
      }
    }
  }

  if (rVisitas && rVisitas.ok) {
    const visitas = await rVisitas.json();
    const tbody = document.getElementById('detalleVisitasBody');
    const tabla = document.getElementById('detalleVisitasTabla');
    const vacia = document.getElementById('detalleVisitasVacia');
    if (!visitas.length) {
      vacia.style.display = 'block';
    } else {
      tabla.style.display = '';
      tbody.innerHTML = visitas.map(v => `<tr>
        <td>${v.FechaVisita ? new Date(v.FechaVisita).toLocaleDateString('es-CO') : '—'}</td>
        <td>${v.Asesor || '—'}</td>
        <td style="text-align:center">${v.CantidadPersonas ?? '—'}</td>
        <td style="font-size:.8rem;max-width:180px">${v.Notas || '—'}</td>
        <td style="text-align:center">${badgeVisita(v.Estado)}</td>
      </tr>`).join('');
    }
  }
}

function _renderProductosPills(productosStr) {
  if (!productosStr) return '<span style="color:var(--muted)">—</span>';
  return productosStr.split(' | ').map(p => {
    const match = p.match(/^(.+)\s\(x(\d+)\s·\s\$(.+)\)$/);
    if (match) {
      const [, nombre, cantidad, precio] = match;
      return `<span style="display:inline-flex;align-items:center;gap:6px;
        background:var(--surface2);border:1px solid var(--border);
        border-radius:8px;padding:3px 10px;margin:2px 3px 2px 0;font-size:.75rem;white-space:nowrap">
        <span style="color:var(--text)">${nombre}</span>
        <span style="background:var(--accent);color:#fff;border-radius:4px;padding:1px 6px;font-size:.68rem;font-weight:600">x${cantidad}</span>
        <span style="color:var(--muted)">$${precio}</span>
      </span>`;
    }
    return `<span style="display:inline-block;background:var(--surface2);border:1px solid var(--border);
      border-radius:8px;padding:3px 10px;margin:2px 3px 2px 0;font-size:.75rem">${p}</span>`;
  }).join('');
}

function _renderContacto(d) {
  if (d.tipo === 'Cliente') {
    return `<div class="detalle-grid">
      <div class="detalle-field"><label>Cédula</label><span>${d.Cedula || '—'}</span></div>
      <div class="detalle-field"><label>Nombre</label><span>${d.Nombre || '—'}</span></div>
      <div class="detalle-field"><label>Celular</label><span>${d.Celular || '—'}</span></div>
      <div class="detalle-field"><label>Teléfono</label><span>${d.Telefono || '—'}</span></div>
      <div class="detalle-field"><label>Correo</label><span>${d.CorreoElectronico || '—'}</span></div>
      <div class="detalle-field"><label>Dirección</label><span>${d.Direccion || '—'}</span></div>
    </div>`;
  }
  return `<div class="detalle-grid">
    <div class="detalle-field"><label>Nombre</label><span>${d.Nombre || '—'}</span></div>
    <div class="detalle-field"><label>Celular</label><span>${d.Celular || '—'}</span></div>
    <div class="detalle-field" style="grid-column:1/-1"><label>Dirección</label><span>${d.Direccion || '—'}</span></div>
  </div>`;
}

// ── Modal: Nueva Compra ───────────────────────────────────────────────────────

let _compraCtx   = { personaId: null, tipoPersona: null, cedulaCliente: null };
let _cochinaItems = [];
let _compraItems  = [];
let _referidos    = [];

function cerrarNuevaCompra() { document.getElementById('modalNuevaCompra').classList.remove('open'); _resetReferidos(); }
function cerrarNuevaCompraSiOverlay(e) { if (e.target === document.getElementById('modalNuevaCompra')) cerrarNuevaCompra(); }

function abrirVentaLibre() {
  _compraCtx = { personaId: null, tipoPersona: 'libre', cedulaCliente: null };
  _compraItems = []; _cochinaItems = []; _resetReferidos();
  document.getElementById('compraModalTitulo').textContent = 'Nueva venta';
  document.getElementById('compraStatus').innerHTML = '';
  document.getElementById('compraFormaPago').value  = '';
  document.getElementById('compraNotas').value      = '';
  document.getElementById('buscarProductoPanel').style.display = 'none';
  document.getElementById('buscarProductoInput').value = '';
  document.getElementById('compraAvisoProspecto').style.display = 'none';
  _renderizarTablaProductos();
  _setInfoForm({}, false);
  ['compraCedula','compraCorreo','compraNombre','compraCelular','compraTelefono','compraDireccion']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('modalNuevaCompra').classList.add('open');
  setTimeout(() => document.getElementById('compraCedula').focus(), 80);
  _cargarProductosCocina();
}

async function abrirNuevaCompra(personaId, tipoPersona, nombre, celular, direccion) {
  _compraCtx = { personaId, tipoPersona, cedulaCliente: null };
  _compraItems = []; _cochinaItems = []; _resetReferidos();
  document.getElementById('compraModalTitulo').textContent = `Nueva compra — ${nombre}`;
  document.getElementById('compraStatus').innerHTML = '';
  document.getElementById('compraFormaPago').value  = '';
  document.getElementById('compraNotas').value      = '';
  document.getElementById('buscarProductoPanel').style.display = 'none';
  document.getElementById('buscarProductoInput').value = '';
  _renderizarTablaProductos();

  const esCliente = tipoPersona === 'Cliente';
  document.getElementById('compraAvisoProspecto').style.display = esCliente ? 'none' : '';

  if (!esCliente) {
    _setInfoForm({ Nombre: nombre, Celular: celular, Direccion: direccion }, false);
    document.getElementById('compraCedula').value   = '';
    document.getElementById('compraCorreo').value   = '';
    document.getElementById('compraTelefono').value = '';
  } else {
    _setInfoForm({ Nombre: nombre, Celular: celular, Direccion: direccion }, true);
    document.getElementById('compraCedula').value = 'Cargando...';
    const _fetchPersonaId = personaId;
    apiFetch(ENDPOINTS.TELEMERCADEO.CLIENTE_POR_PERSONA(personaId))
      .then(r => r?.ok ? r.json() : null)
      .then(d => {
        if (_compraCtx.personaId !== _fetchPersonaId) return;
        if (d) {
          _compraCtx.cedulaCliente = d.Cedula;
          document.getElementById('compraCedula').value    = d.Cedula            || '';
          document.getElementById('compraCorreo').value    = d.CorreoElectronico || '';
          document.getElementById('compraNombre').value    = d.Nombre            || '';
          document.getElementById('compraCelular').value   = String(d.Celular    || '');
          document.getElementById('compraTelefono').value  = String(d.Telefono   || '');
          document.getElementById('compraDireccion').value = d.Direccion         || '';
        } else {
          document.getElementById('compraCedula').value = '';
        }
      });
  }

  document.getElementById('modalNuevaCompra').classList.add('open');
  _cargarProductosCocina();
}

function _setInfoForm(datos, readonly) {
  ['compraCedula','compraCorreo','compraNombre','compraCelular','compraTelefono','compraDireccion'].forEach(id => {
    const el = document.getElementById(id);
    el.readOnly = readonly;
    el.style.opacity = readonly ? '.7' : '';
    el.style.cursor  = readonly ? 'default' : '';
  });
  document.getElementById('compraNombre').value    = datos.Nombre    || '';
  document.getElementById('compraCelular').value   = String(datos.Celular  || '');
  document.getElementById('compraDireccion').value = datos.Direccion || '';
  document.getElementById('compraCedula').readOnly = readonly;
}

async function _cargarProductosCocina() {
  const r = await apiFetch(ENDPOINTS.TELEMERCADEO.INVENTARIO_COCINA);
  if (r && r.ok) _cochinaItems = await r.json();
}

function _toggleBuscarProducto() {
  const panel = document.getElementById('buscarProductoPanel');
  const abierto = panel.style.display !== 'none';
  panel.style.display = abierto ? 'none' : '';
  if (!abierto) {
    document.getElementById('buscarProductoInput').value = '';
    _filtrarBuscarProducto('');
    setTimeout(() => document.getElementById('buscarProductoInput').focus(), 50);
  }
}

function _filtrarBuscarProducto(q) {
  const texto = q.toLowerCase().trim();
  const lista = document.getElementById('buscarProductoLista');
  const items = texto ? _cochinaItems.filter(i => i.Nombre.toLowerCase().includes(texto)) : _cochinaItems;
  if (!items.length) {
    lista.innerHTML = '<span style="color:var(--muted);font-size:.82rem;padding:4px 8px">Sin resultados</span>';
    return;
  }
  lista.innerHTML = items.map(item => {
    const yaEsta = _compraItems.some(i => i.inventarioId === item.ID);
    return `<div onclick="_agregarProducto(${item.ID},'${item.Nombre.replace(/'/g,"\\'")}',${item.Valor},${item.Cantidad})"
      style="display:flex;align-items:center;justify-content:space-between;
        padding:7px 10px;border-radius:6px;cursor:pointer;gap:10px;
        background:${yaEsta ? 'rgba(108,99,255,.08)' : 'transparent'};transition:background .1s"
      onmouseover="this.style.background='rgba(108,99,255,.12)'"
      onmouseout="this.style.background='${yaEsta ? 'rgba(108,99,255,.08)' : 'transparent'}'">
      <span style="font-size:.85rem;flex:1">${item.Nombre}</span>
      <span style="color:var(--green);font-size:.78rem;font-weight:600;white-space:nowrap">
        $${Number(item.Valor).toLocaleString('es-CO')}
      </span>
      <span style="color:var(--muted);font-size:.72rem;white-space:nowrap">Stock: ${item.Cantidad}</span>
      ${yaEsta ? '<span style="color:var(--accent2);font-size:.7rem">✓ añadido</span>' : ''}
    </div>`;
  }).join('');
}

function _agregarProducto(inventarioId, nombre, precio, stock) {
  const existing = _compraItems.find(i => i.inventarioId === inventarioId);
  if (existing) {
    existing.cantidad = Math.min(existing.cantidad + 1, stock);
  } else {
    _compraItems.push({ inventarioId, nombre, precio, cantidad: 1, stock });
  }
  _renderizarTablaProductos();
  document.getElementById('buscarProductoPanel').style.display = 'none';
}

function _quitarProducto(inventarioId) {
  _compraItems = _compraItems.filter(i => i.inventarioId !== inventarioId);
  _renderizarTablaProductos();
}

function _cambiarCantidadProducto(inventarioId, val) {
  const item = _compraItems.find(i => i.inventarioId === inventarioId);
  if (item) { item.cantidad = Math.max(1, Math.min(Number(val) || 1, item.stock)); _actualizarTotalCompra(); }
}

function _renderizarTablaProductos() {
  const tbody = document.getElementById('compraProductosBody');
  const tabla = document.getElementById('compraProductosTabla');
  const vacio = document.getElementById('compraProductosVacio');
  if (!_compraItems.length) {
    tabla.style.display = 'none'; vacio.style.display = 'block';
    document.getElementById('compraTotalVal').textContent = '$0';
    return;
  }
  tabla.style.display = ''; vacio.style.display = 'none';
  tbody.innerHTML = _compraItems.map(item => `<tr>
    <td style="font-size:.88rem">${item.nombre}</td>
    <td style="text-align:center">
      <input type="number" value="${item.cantidad}" min="1" max="${item.stock}"
        style="width:64px;padding:3px 6px;border-radius:6px;border:1px solid var(--border);
          background:var(--surface2);color:var(--text);font-size:.85rem;text-align:center"
        oninput="_cambiarCantidadProducto(${item.inventarioId},this.value)" />
    </td>
    <td style="text-align:right;color:var(--muted);font-size:.85rem">
      $${Number(item.precio).toLocaleString('es-CO')}
    </td>
    <td style="text-align:right;font-weight:600;font-size:.9rem">
      $${(item.precio * item.cantidad).toLocaleString('es-CO')}
    </td>
    <td style="text-align:center">
      <button onclick="_quitarProducto(${item.inventarioId})"
        style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem;padding:2px 4px">✕</button>
    </td>
  </tr>`).join('');
  _actualizarTotalCompra();
}

function _actualizarTotalCompra() {
  const total = _compraItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('compraTotalVal').textContent = '$' + total.toLocaleString('es-CO');
}

// ── Beneficio 4x14 ────────────────────────────────────────────────────────────

function _resetReferidos() {
  _referidos = [];
  document.getElementById('chkBeneficio4x14').checked = false;
  document.getElementById('panelReferidos').style.display = 'none';
  _renderizarReferidos();
}

function _toggleBeneficio4x14() {
  const checked = document.getElementById('chkBeneficio4x14').checked;
  document.getElementById('panelReferidos').style.display = checked ? '' : 'none';
  if (!checked) { _referidos = []; _renderizarReferidos(); }
}

function _agregarReferido() { _referidos.push({ nombre:'', celular:'', direccion:'' }); _renderizarReferidos(); }
function _quitarReferido(idx) { _referidos.splice(idx, 1); _renderizarReferidos(); }
function _actualizarReferido(idx, campo, valor) { if (_referidos[idx]) _referidos[idx][campo] = valor; }

function _renderizarReferidos() {
  const lista    = document.getElementById('referidosLista');
  const vacio    = document.getElementById('referidosVacio');
  const contador = document.getElementById('referidosContador');
  const n = _referidos.length;
  contador.textContent = `(${n} / mín. 10)`;
  contador.style.color = n >= 10 ? 'var(--green)' : 'var(--accent2)';
  if (!n) { lista.innerHTML = ''; vacio.style.display = 'block'; return; }
  vacio.style.display = 'none';
  lista.innerHTML = _referidos.map((r, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:center;
      padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px">
      <input type="text" placeholder="Nombre *" value="${r.nombre.replace(/"/g,'&quot;')}"
        oninput="_actualizarReferido(${i},'nombre',this.value)"
        style="padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:.82rem;outline:none" />
      <input type="text" placeholder="Celular *" value="${r.celular.replace(/"/g,'&quot;')}"
        oninput="_actualizarReferido(${i},'celular',this.value)"
        style="padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:.82rem;outline:none" />
      <input type="text" placeholder="Dirección *" value="${r.direccion.replace(/"/g,'&quot;')}"
        oninput="_actualizarReferido(${i},'direccion',this.value)"
        style="padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:.82rem;outline:none" />
      <button onclick="_quitarReferido(${i})"
        style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:1rem;padding:2px 6px">✕</button>
    </div>`).join('');
}

async function registrarCompra() {
  const formaPago = document.getElementById('compraFormaPago').value;
  const notas     = document.getElementById('compraNotas').value.trim();

  if (_compraItems.length === 0) { setStatus('compraStatus', 'error', '❌ Añade al menos un producto'); return; }
  if (!formaPago)                { setStatus('compraStatus', 'error', '❌ Selecciona una forma de pago'); return; }

  const btn = document.getElementById('btnRegistrarCompra');
  btn.disabled = true;
  let cedulaCliente = _compraCtx.cedulaCliente;

  if (_compraCtx.tipoPersona === 'libre') {
    const cedula = document.getElementById('compraCedula').value.trim();
    if (!cedula) {
      setStatus('compraStatus', 'error', '❌ La cédula es obligatoria');
      btn.disabled = false; return;
    }
    btn.textContent = 'Verificando cliente...';
    const rL = await apiFetch(ENDPOINTS.TELEMERCADEO.CLIENTE_LIBRE, {
      method: 'POST',
      body: JSON.stringify({
        cedula,
        nombre:            document.getElementById('compraNombre').value.trim()    || null,
        celular:           document.getElementById('compraCelular').value.trim()   || null,
        telefono:          document.getElementById('compraTelefono').value.trim()  || null,
        correoElectronico: document.getElementById('compraCorreo').value.trim()    || null,
        direccion:         document.getElementById('compraDireccion').value.trim() || null,
      }),
    });
    if (!rL || !rL.ok) {
      btn.disabled = false; btn.textContent = 'Registrar compra';
      const d = await rL?.json().catch(() => ({}));
      setStatus('compraStatus', 'error', `❌ ${d?.error || 'Error al verificar cliente'}`);
      return;
    }
    cedulaCliente = (await rL.json()).cedula;
  }

  if (_compraCtx.tipoPersona !== 'Cliente' && _compraCtx.tipoPersona !== 'libre') {
    const cedula = document.getElementById('compraCedula').value.trim();
    if (!cedula) {
      setStatus('compraStatus', 'error', '❌ La cédula del cliente es obligatoria');
      btn.disabled = false; return;
    }
    btn.textContent = 'Creando cliente...';
    const rC = await apiFetch(ENDPOINTS.TELEMERCADEO.CREAR_CLIENTE, {
      method: 'POST',
      body: JSON.stringify({
        personaId:         _compraCtx.personaId,
        cedula,
        correoElectronico: document.getElementById('compraCorreo').value.trim()    || null,
        nombre:            document.getElementById('compraNombre').value.trim()    || null,
        celular:           document.getElementById('compraCelular').value.trim()   || null,
        telefono:          document.getElementById('compraTelefono').value.trim()  || null,
        direccion:         document.getElementById('compraDireccion').value.trim() || null,
      }),
    });
    if (!rC || !rC.ok) {
      btn.disabled = false; btn.textContent = 'Registrar compra';
      const d = await rC?.json().catch(() => ({}));
      setStatus('compraStatus', 'error', `❌ ${d?.error || 'Error al crear cliente'}`);
      return;
    }
    cedulaCliente = (await rC.json()).cedula;
  }

  if (!cedulaCliente) {
    btn.disabled = false; btn.textContent = 'Registrar compra';
    setStatus('compraStatus', 'error', '❌ No se pudo obtener la cédula del cliente');
    return;
  }

  const aplicaBeneficio = document.getElementById('chkBeneficio4x14').checked;
  if (aplicaBeneficio) {
    if (_referidos.length < 10) {
      setStatus('compraStatus', 'error', `❌ Debes agregar mínimo 10 referidos (tienes ${_referidos.length})`);
      btn.disabled = false; return;
    }
    if (_referidos.some(r => !r.nombre.trim() || !r.celular.trim() || !r.direccion.trim())) {
      setStatus('compraStatus', 'error', '❌ Todos los referidos deben tener nombre, celular y dirección');
      btn.disabled = false; return;
    }
  }

  btn.textContent = 'Guardando...';
  const items    = _compraItems.map(i => ({ inventarioId: i.inventarioId, cantidad: i.cantidad }));
  const referidos = aplicaBeneficio
    ? _referidos.map(r => ({ nombre: r.nombre.trim(), celular: r.celular.trim() || null, direccion: r.direccion.trim() || null }))
    : null;

  const r = await apiFetch(ENDPOINTS.TELEMERCADEO.NUEVA_COMPRA, {
    method: 'POST',
    body: JSON.stringify({ cedulaCliente, formaPago, notas, items, referidos }),
  });

  btn.disabled = false; btn.textContent = 'Registrar compra';

  if (!r || !r.ok) {
    const d = await r?.json().catch(() => ({}));
    setStatus('compraStatus', 'error', `❌ ${d?.error || 'Error al registrar'}`);
    return;
  }

  cerrarNuevaCompra();
  await cargarDatosAsesor();
}
