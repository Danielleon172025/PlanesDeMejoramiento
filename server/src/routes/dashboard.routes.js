// server/src/routes/dashboard.routes.js
import { Router } from 'express';
import {
    getKPIs,
    getUserKPIs,
    getGraficas,
    getEstadisticasPorDependencia,
    getAlertas,
    getMetricasUsuarios,
    getRolesDisponibles,
    getEstadisticasPorRol,
    getAnalisisUsuarios
} from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/kpis', getKPIs);
router.get('/mis-kpis', getUserKPIs);
router.get('/graficas', getGraficas);
router.get('/estadisticas-dependencias', getEstadisticasPorDependencia);
router.get('/alertas', getAlertas);
router.get('/metricas-usuarios', getMetricasUsuarios);
router.get('/roles-disponibles', getRolesDisponibles);
router.get('/estadisticas-roles', getEstadisticasPorRol);
router.get('/analisis-usuarios', getAnalisisUsuarios);

export default router;
