// server/src/routes/listas.routes.js
import { Router } from 'express';
import { getListas } from '../controllers/listas.controller.js';

const router = Router();

router.get('/:tipo', getListas);

export default router;
