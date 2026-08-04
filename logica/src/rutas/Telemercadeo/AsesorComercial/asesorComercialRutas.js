const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../../utils/requestHelpers');
const svc = require('../../../servicios/Telemercadeo/AsesorComercial/visitaServicio');
const compraSvc = require('../../../servicios/Telemercadeo/AsesorComercial/compraServicio');

// Solo valida el token aquí; el rol se exige por ruta (ver comentario más abajo).
router.use(verificarToken);

// El chequeo de rol se aplica por ruta, no como router.use() global: este router
// comparte prefijo de montaje con telemercaderRutas (ambos van bajo /api/telemercadeo
// sin un path propio), así que un router.use(verificarRol(...)) global interceptaría
// también las peticiones dirigidas al otro sub-router antes de que Express pudiera
// intentarlo, bloqueando por error a los demás roles.
const soloAsesor = verificarRol('Asesor comercial');

// ─── Visitas ──────────────────────────────────────────────────────────────────

router.get('/visitas/semana', soloAsesor, async (req, res) => {
    try {
        const { cedula } = req.usuario;
        const [visitas, kpi] = await Promise.all([
            svc.listarSemana(cedula),
            svc.kpiSemana(cedula),
        ]);
        res.json({ visitas, kpi });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/mes', soloAsesor, async (req, res) => {
    try {
        const visitas = await svc.listarMes(req.usuario.cedula);
        res.json(visitas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/buscar', soloAsesor, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const visitas = await svc.buscar(req.usuario.cedula, q);
        res.json(visitas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/alimentacion', soloAsesor, async (_req, res) => {
    try {
        const items = await svc.obtenerAlimentacion();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visitas/estado', soloAsesor, async (req, res) => {
    try {
        const { visitaId, estado, suplementos = [], notas } = req.body;
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.cambiarEstado(visitaId, estado, suplementos, auditCtx, notas);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─── Persona ──────────────────────────────────────────────────────────────────

router.get('/persona/detalle', soloAsesor, async (req, res) => {
    try {
        const datos = await svc.detallePersona(Number(req.query.personaId));
        if (!datos) return res.status(404).json({ error: 'Persona no encontrada' });
        res.json(datos);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/persona/compras', soloAsesor, async (req, res) => {
    try {
        const rows = await svc.historialCompras(Number(req.query.personaId));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/persona/visitas', soloAsesor, async (req, res) => {
    try {
        const rows = await svc.historialVisitas(Number(req.query.personaId));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Compras ──────────────────────────────────────────────────────────────────

router.get('/compras/mis-compras', soloAsesor, async (req, res) => {
    try {
        const result = await compraSvc.listarComprasTrabajador(req.usuario.cedula);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/mis-compras/semana', soloAsesor, async (req, res) => {
    try {
        const result = await compraSvc.listarComprasTrabajadorSemana(req.usuario.cedula);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/mis-compras/mes', soloAsesor, async (req, res) => {
    try {
        const result = await compraSvc.listarComprasTrabajadorMes(req.usuario.cedula);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/mis-compras/buscar', soloAsesor, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const result = await compraSvc.buscarComprasTrabajador(req.usuario.cedula, q);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/mis-compras/kpi-mes', soloAsesor, async (req, res) => {
    try {
        const result = await compraSvc.kpiComprasMes(req.usuario.cedula);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/inventario-cocina', soloAsesor, async (_req, res) => {
    try {
        const items = await compraSvc.inventarioCocina();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/cliente-por-persona', soloAsesor, async (req, res) => {
    try {
        const datos = await compraSvc.clientePorPersona(Number(req.query.personaId));
        res.json(datos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/compras/crear-cliente', soloAsesor, async (req, res) => {
    try {
        const { personaId, ...datos } = req.body;
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await compraSvc.crearClienteDesdeProspecto(personaId, datos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/compras/cliente-libre', soloAsesor, async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await compraSvc.registrarClienteLibre(req.body, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/compras/nueva', soloAsesor, async (req, res) => {
    try {
        const { cedulaCliente, formaPago, notas, items, referidos } = req.body;
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await compraSvc.crearCompra(cedulaCliente, req.usuario, formaPago, notas, items, referidos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
