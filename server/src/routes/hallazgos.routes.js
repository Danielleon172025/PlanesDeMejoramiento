// server/src/routes/hallazgos.routes.js
import { Router } from 'express';
import {
    getKPIs,
    getGraficas,
    getHallazgos,
    getHallazgoById,
    createHallazgo,
    updateHallazgo,
    deleteHallazgo,
    closeHallazgo,
} from '../controllers/hallazgos.controller.js';
import { requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/kpis', getKPIs);
router.get('/graficas', getGraficas);

// Módulo Hallazgos - Administrador, Control Interno
router.post('/', requirePermission('hallazgos', 'crear'), createHallazgo);
router.put('/:id', requirePermission('hallazgos', 'editar'), updateHallazgo);
router.delete('/:id', requirePermission('hallazgos', 'eliminar'), deleteHallazgo);
router.put('/:id/cerrar', requirePermission('hallazgos', 'eliminar'), closeHallazgo);

router.get('/:id', getHallazgoById);
router.get('/', getHallazgos);

export default router;
