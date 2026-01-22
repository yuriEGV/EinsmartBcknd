/*import express from 'express';
import {
    registrar,
    login,
    invalidateToken,
    obtenerPerfil,
    actualizarPerfil
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Registro y autenticación
router.post('/registro', registrar);
router.post('/login', login);

// Gestión de sesión
router.post('/invalidate', authMiddleware, invalidateToken);
router.post('/logout', authMiddleware, invalidateToken);

// Perfil del usuario autenticado
router.get('/perfil', authMiddleware, obtenerPerfil);
router.put('/perfil', authMiddleware, actualizarPerfil);

export default router;
*/


import express from 'express';
import {
    registrar,
    login,
    invalidateToken,
    obtenerPerfil,
    actualizarPerfil,
    recuperarPassword,
    resetPassword
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/* ===============================
   RUTAS PÚBLICAS
================================ */
router.post('/registro', registrar);
router.post('/login', login);
router.post('/recover-password', recuperarPassword);
router.post('/reset-password', resetPassword);

/* ===============================
   RUTAS PROTEGIDAS
================================ */
router.post('/logout', authMiddleware, invalidateToken);
router.post('/invalidate', authMiddleware, invalidateToken);

router.get('/perfil', authMiddleware, obtenerPerfil);
router.put('/perfil', authMiddleware, actualizarPerfil);

export default router;


