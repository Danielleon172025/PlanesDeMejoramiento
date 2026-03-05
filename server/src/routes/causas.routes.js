import { Router } from 'express';
import {
    createCausa,
    deleteCausa,
    getCausas,
    updateCausa,
} from '../controllers/causas.controller.js';
import { requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getCausas);
router.post('/', requirePermission('hallazgos', 'crear'), createCausa);
router.put('/:id', requirePermission('hallazgos', 'editar'), updateCausa);
router.delete('/:id', requirePermission('hallazgos', 'eliminar'), deleteCausa);

export default router;
