import { Router } from 'express';
import {
    getAllPermissions,
    saveRolePermissions,
    getMyPermissions,
} from '../controllers/permissions.controller.js';
import { requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

// Solo usuarios con permisos de Configuración pueden editar esto
router.get('/', requirePermission('config', 'ver'), getAllPermissions);
router.put('/:roleId', requirePermission('config', 'editar'), saveRolePermissions);

// Cualquier usuario autenticado puede consultar sus propios permisos
router.get('/me', getMyPermissions);

export default router;
