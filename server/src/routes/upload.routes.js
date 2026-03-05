import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller.js';

const router = Router();

// Endpoint for uploading single files
router.post('/', uploadFile);

export default router;
