// ── Lógica de la página de login ─────────────────────────────────────────────
// Depende de: config.js (API)

// Si ya hay sesión activa, ir directo al panel
if (localStorage.getItem('baldrium_token')) {
  window.location.href = 'index.html';
}

function setStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = 'status-bar status-' + type;
  el.innerHTML = msg;
}

async function doLogin() {
  const cedula    = document.getElementById('cedula').value.trim();
  const contrasena = document.getElementById('contrasena').value;

  if (!cedula || !contrasena) {
    setStatus('loginStatus', 'error', '❌ Completa la cédula y la contraseña');
    return;
  }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  setStatus('loginStatus', 'loading', '<span class="spinner"></span> Verificando credenciales...');

  try {
    const r = await fetch(`${API}${ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, contrasena }),
    });
    const data = await r.json();

    if (r.ok) {
      setStatus('loginStatus', 'ok', `✅ Bienvenido, <strong>${data.usuario.nombre}</strong>`);
      localStorage.setItem('baldrium_token', data.token);
      localStorage.setItem('baldrium_user',  JSON.stringify(data.usuario));
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } else {
      setStatus('loginStatus', 'error', '❌ ' + (data.error || 'Credenciales inválidas'));
      btn.disabled = false;
    }
  } catch {
    setStatus('loginStatus', 'error', '❌ No se pudo conectar con el servidor');
    btn.disabled = false;
  }
}

// ── Modal: Olvidé mi contraseña ──────────────────────────────────────────────

function abrirModal() {
  document.getElementById('recuperarCorreo').value = '';
  setStatus('recuperarStatus', 'idle', '⏳ Ingresa tu correo y presiona el botón');
  document.getElementById('btnRecuperar').disabled = false;
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('recuperarCorreo').focus(), 80);
}

function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function cerrarModalSiOverlay(e) { if (e.target === document.getElementById('modalOverlay')) cerrarModal(); }

async function doOlvideMiContrasena() {
  const correo = document.getElementById('recuperarCorreo').value.trim();
  if (!correo || !correo.includes('@')) {
    setStatus('recuperarStatus', 'error', '❌ Ingresa un correo electrónico válido');
    return;
  }

  const btn = document.getElementById('btnRecuperar');
  btn.disabled = true;
  setStatus('recuperarStatus', 'loading', '<span class="spinner"></span> Enviando...');

  try {
    const r = await fetch(`${API}${ENDPOINTS.AUTH.OLVIDE_CONTRASENA}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo }),
    });
    const data = await r.json();

    if (r.ok && !data.error) {
      setStatus('recuperarStatus', 'ok', '✅ Si el correo existe en el sistema, recibirás la contraseña temporal.');
    } else {
      setStatus('recuperarStatus', 'error', '❌ ' + (data.error || 'Error al procesar la solicitud'));
      btn.disabled = false;
    }
  } catch {
    setStatus('recuperarStatus', 'error', '❌ No se pudo conectar con el servidor');
    btn.disabled = false;
  }
}

// ── Atajos de teclado ────────────────────────────────────────────────────────
document.getElementById('contrasena').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('recuperarCorreo').addEventListener('keydown', e => {
  if (e.key === 'Enter') doOlvideMiContrasena();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});
