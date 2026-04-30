// ── Utilidades compartidas entre módulos ─────────────────────────────────────

function setStatus(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'status-bar status-' + type;
  el.innerHTML = msg;
}

function iniciales(nombre) {
  return (nombre || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

// "2024-03-15T10:30:00" → "15/03/24 10:30"
function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// Formato monetario colombiano: "$12.500"
function formatMoneda(v) {
  return '$' + parseFloat(v).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Escapa comillas para uso dentro de atributos HTML onclick
function escHtml(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Fecha corta con resaltado si es hoy: "lun. 15 mar" o "HOY · 15 mar"
function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const esHoy = d.toDateString() === new Date().toDateString();
  const str = d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  return esHoy
    ? `<strong style="color:var(--accent2)">HOY · ${str.split(',')[1]?.trim() ?? str}</strong>`
    : str;
}

// Fecha + hora compacta: "Hoy 10:30" o "15 mar 10:30"
function fmtFechaHora(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  const esHoy = d.toDateString() === new Date().toDateString();
  const fecha = esHoy ? 'Hoy' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  const hora  = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
}
