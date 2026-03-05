// server/src/routes/acciones.routes.js

import { Router } from 'express';
import {
    createAccion,
    createEvaluacion,
    getAcciones,
    getAccionById,
    getDetalleHallazgo,
    getTimelineAccion,
    solicitarNovedadAccion,
    triggerExpirationCheck,
    updateAccion,
    approveAccion,
    evaluateProgressLog,
    replyToObservation,
    getNovedadesPendientes,
    resolverNovedad
} from '../controllers/acciones.controller.js';
import { requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

// ✅ Route for expiration check (CRON or manual)
router.post('/check-expiration', triggerExpirationCheck);

// ✅ Rutas estáticas ANTES de las dinámicas
router.get('/detalle-hallazgo/:id', getDetalleHallazgo);
router.get('/novedades', requirePermission('novedades', 'ver'), getNovedadesPendientes);
router.put('/novedades/:novedadId', requirePermission('novedades', 'editar'), resolverNovedad);
router.get('/', getAcciones);
router.get('/:id', getAccionById);
router.get('/:id/timeline', getTimelineAccion);
router.post('/', requirePermission('acciones', 'crear'), createAccion);
router.put('/:id', requirePermission('acciones', 'editar'), updateAccion);
router.post('/:id/novedades', requirePermission('novedades', 'crear'), solicitarNovedadAccion);
router.post('/:accionId/evaluaciones', requirePermission('seguimientos', 'crear'), createEvaluacion);
router.put('/:accionId/evaluaciones/:logId', requirePermission('seguimientos', 'editar'), evaluateProgressLog);
router.put('/:accionId/evaluaciones/:logId/replica', requirePermission('seguimientos', 'crear'), replyToObservation);
router.put('/:id/aprobar', requirePermission('novedades', 'editar'), approveAccion);

export default router;
