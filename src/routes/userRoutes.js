import express from 'express';
import UserController from '../controllers/userController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/* ===============================
   USERS (protegido)
================================ */

// Crear usuario (admin o sostenedor)
router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    UserController.createUser
);

// Obtener usuarios del tenant actual
router.get(
    '/',
    authMiddleware,
    UserController.getUsers
);

// Obtener usuario por ID (del mismo tenant)
router.get(
    '/:id',
    authMiddleware,
    UserController.getUserById
);

// Actualizar usuario
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    UserController.updateUser
);

// Eliminar usuario
router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    UserController.deleteUser
);

export default router;
