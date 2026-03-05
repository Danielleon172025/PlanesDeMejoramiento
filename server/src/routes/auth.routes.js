import { Router } from 'express';
import { getMicrosoftAuthUrl, handleMicrosoftCallback, loginLocal, changePassword, forgotPassword } from '../controllers/auth.controller.js';

const router = Router();

// Devuelve la URL de login con los datos del tenant y cliente leídos desde la BD.
router.get('/microsoft/url', getMicrosoftAuthUrl);

// Recibe el 'code' desde el cliente y lo intercambia por datos en MS Graph y DB.
router.post('/microsoft/callback', handleMicrosoftCallback);

// Autenticación tradicional
router.post('/login', loginLocal);

// Cambio de contraseña obligatorio
router.post('/change-password', changePassword);

// Recuperación de contraseña (envío de clave temporal por correo)
router.post('/forgot-password', forgotPassword);

export default router;
