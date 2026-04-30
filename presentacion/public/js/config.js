// ── URL base del backend ────────────────────────────────────────────────────
const API = 'http://localhost:3000';

// ── Endpoints centralizados ─────────────────────────────────────────────────
// Para cambiar una ruta basta modificar aquí; ningún módulo tiene rutas hardcodeadas.
const ENDPOINTS = {

  AUTH: {
    LOGIN:            '/api/auth/login',
    OLVIDE_CONTRASENA:'/api/auth/olvide-contrasena',
  },

  PERFIL: {
    GET:        '/api/perfil',
    UPDATE:     '/api/perfil',
    CONTRASENA: '/api/perfil/contrasena',
  },

  USUARIO: {
    LIST:      '/api/Usuario',
    CREATE:    '/api/Usuario',
    UPDATE:    (cedula) => `/api/Usuario/${cedula}`,
    ESTADO:    (cedula) => `/api/Usuario/${cedula}/estado`,
    ROLES:     '/api/Usuario/roles',
    AUDITORIA: '/api/Usuario/auditoria',
  },

  INVENTARIO: {
    LIST:          '/api/Inventario',
    CREATE:        '/api/Inventario',
    UPDATE:        (id) => `/api/Inventario/${id}`,
    DELETE:        (id) => `/api/Inventario/${id}`,
    AUDITORIA:     '/api/Inventario/auditoria',
    AUDITORIA_INFO:'/api/Inventario/auditoria/info',
  },

  TELEMERCADEO: {
    VISITAS_SEMANA:      '/api/telemercadeo/visitas/semana',
    VISITAS_MES:         '/api/telemercadeo/visitas/mes',
    VISITAS_BUSCAR:      (q) => `/api/telemercadeo/visitas/buscar?q=${encodeURIComponent(q)}`,
    VISITAS_ALIMENTACION:'/api/telemercadeo/visitas/alimentacion',
    VISITAS_ESTADO:      '/api/telemercadeo/visitas/estado',

    PERSONA_DETALLE:     (id) => `/api/telemercadeo/persona/detalle?personaId=${id}`,
    PERSONA_VISITAS:     (id) => `/api/telemercadeo/persona/visitas?personaId=${id}`,
    PERSONA_COMPRAS:     (id) => `/api/telemercadeo/persona/compras?personaId=${id}`,

    COMPRAS_SEMANA:      '/api/telemercadeo/compras/mis-compras/semana',
    COMPRAS_MES:         '/api/telemercadeo/compras/mis-compras/mes',
    COMPRAS_KPI_MES:     '/api/telemercadeo/compras/mis-compras/kpi-mes',
    COMPRAS_BUSCAR:      (q) => `/api/telemercadeo/compras/mis-compras/buscar?q=${encodeURIComponent(q)}`,

    INVENTARIO_COCINA:   '/api/telemercadeo/compras/inventario-cocina',
    CLIENTE_POR_PERSONA: (id) => `/api/telemercadeo/compras/cliente-por-persona?personaId=${id}`,
    CLIENTE_LIBRE:       '/api/telemercadeo/compras/cliente-libre',
    CREAR_CLIENTE:       '/api/telemercadeo/compras/crear-cliente',
    NUEVA_COMPRA:        '/api/telemercadeo/compras/nueva',
  },
};
