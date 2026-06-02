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
    resetPassword,
    cambiarPassword,
    forceSeedYuriAdmin
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Rate limiter para el login (5 intentos por 15 minutos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo después de 15 minutos.' }
});

// Middleware de validación
const validateLogin = [
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

/* ===============================
   RUTAS PÚBLICAS
================================ */
router.post('/registro', registrar);
router.post('/login', loginLimiter, validateLogin, login);
router.get('/force-seed-admin', forceSeedYuriAdmin);
router.post('/recover-password', recuperarPassword);
router.post('/reset-password', resetPassword);
router.post('/bootstrap', async (req, res) => {
    // Forward to users bootstrap endpoint
    // This is a convenience endpoint - the actual logic is in userRoutes
    return res.status(302).json({
        message: 'Use POST /api/users/bootstrap instead',
        endpoint: '/api/users/bootstrap'
    });
});

/* ===============================
   RUTAS PROTEGIDAS
================================ */
router.post('/logout', authMiddleware, invalidateToken);
router.post('/invalidate', authMiddleware, invalidateToken);

router.get('/perfil', authMiddleware, obtenerPerfil);
router.put('/perfil', authMiddleware, actualizarPerfil);

export default router;


