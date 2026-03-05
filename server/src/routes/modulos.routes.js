import { Router } from 'express';
import {
    assignRoleToUser,
    createUser,
    getAprobacionesPendientes,
    getConfiguracion,
    getHistorial,
    getNotificaciones,
    getNotificacionesStream,
    getReportesResumen,
    getResumenModulos,
    getRoles,
    getUsuariosRoles,
    resolverAprobacion,
    updateConfiguracion,
    updateUser,
} from '../controllers/modulos.controller.js';
import { requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/resumen', getResumenModulos);
router.get('/aprobaciones/pendientes', requirePermission('novedades', 'ver'), getAprobacionesPendientes);
router.patch('/aprobaciones/:tipo/:id', requirePermission('novedades', 'editar'), resolverAprobacion);
router.get('/historial', getHistorial);
router.get('/notificaciones/stream', getNotificacionesStream);
router.get('/notificaciones', getNotificaciones);
router.get('/usuarios-roles', requirePermission('usuarios', 'ver'), getUsuariosRoles);
router.post('/usuarios-roles/asignar', requirePermission('usuarios', 'editar'), assignRoleToUser);
router.get('/roles', requirePermission('usuarios', 'ver'), getRoles);
router.post('/usuarios/crear', requirePermission('usuarios', 'crear'), createUser);
router.put('/usuarios/:id', requirePermission('usuarios', 'editar'), updateUser);
router.get('/configuracion', requirePermission('config', 'ver'), getConfiguracion);
router.put('/configuracion', requirePermission('config', 'editar'), updateConfiguracion);
router.get('/reportes/resumen', getReportesResumen);

export default router;
