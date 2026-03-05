import { Router } from 'express';
import { downloadFile, uploadFileBase64 } from '../controllers/files.controller.js';

const router = Router();

router.post('/upload', uploadFileBase64);
router.get('/:filename', downloadFile);

export default router;
