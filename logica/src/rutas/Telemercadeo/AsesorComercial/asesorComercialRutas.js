const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../../../seguridad/jwtMiddleware');
const { extraerIP, extraerDispositivo } = require('../../../utils/requestHelpers');
const svc = require('../../../servicios/Telemercadeo/AsesorComercial/visitaServicio');
const compraSvc = require('../../../servicios/Telemercadeo/AsesorComercial/compraServicio');

// Todas las rutas de este router requieren token válido + rol Asesor comercial
router.use(verificarToken, verificarRol('Asesor comercial'));

// ─── Visitas ──────────────────────────────────────────────────────────────────

router.get('/visitas/semana', async (req, res) => {
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

router.get('/visitas/mes', async (req, res) => {
    try {
        const visitas = await svc.listarMes(req.usuario.cedula);
        res.json(visitas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/buscar', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const visitas = await svc.buscar(req.usuario.cedula, q);
        res.json(visitas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visitas/alimentacion', async (_req, res) => {
    try {
        const items = await svc.obtenerAlimentacion();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visitas/estado', async (req, res) => {
    try {
        const { visitaId, estado, suplementos = [] } = req.body;
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        await svc.cambiarEstado(visitaId, estado, suplementos, auditCtx);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─── Persona ──────────────────────────────────────────────────────────────────

router.get('/persona/detalle', async (req, res) => {
    try {
        const datos = await svc.detallePersona(Number(req.query.personaId));
        if (!datos) return res.status(404).json({ error: 'Persona no encontrada' });
        res.json(datos);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/persona/compras', async (req, res) => {
    try {
        const rows = await svc.historialCompras(Number(req.query.personaId));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/persona/visitas', async (req, res) => {
    try {
        const rows = await svc.historialVisitas(Number(req.query.personaId));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Compras ──────────────────────────────────────────────────────────────────

router.get('/compras/inventario-cocina', async (_req, res) => {
    try {
        const items = await compraSvc.inventarioCocina();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/compras/cliente-por-persona', async (req, res) => {
    try {
        const datos = await compraSvc.clientePorPersona(Number(req.query.personaId));
        res.json(datos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/compras/crear-cliente', async (req, res) => {
    try {
        const { personaId, ...datos } = req.body;
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await compraSvc.crearClienteDesdeProspecto(personaId, datos, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/compras/cliente-libre', async (req, res) => {
    try {
        const auditCtx = { ip: extraerIP(req), device: extraerDispositivo(req), actor: req.usuario };
        const result = await compraSvc.registrarClienteLibre(req.body, auditCtx);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/compras/nueva', async (req, res) => {
    try {
        const { cedulaCliente, formaPago, notas, items } = req.body;
        const result = await compraSvc.crearCompra(cedulaCliente, req.usuario, formaPago, notas, items);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
