import express from 'express';
import UserController from '../controllers/userController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';
import User from '../models/userModel.js';

const router = express.Router();

/* ===============================
   BOOTSTRAP - Crear primer usuario (público)
================================ */
// Endpoint público para crear el primer admin/usuario del sistema (cuando no hay usuarios)
router.post('/bootstrap', async (req, res) => {
    try {
        const { name, email, password, role, tenantId } = req.body;
        
        // Validaciones básicas
        if (!name || !email || !password || !role || !tenantId) {
            return res.status(400).json({ 
                message: 'name, email, password, role y tenantId son obligatorios' 
            });
        }

        // Verificar si ya hay usuarios en el sistema
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            return res.status(403).json({ 
                message: 'Bootstrap solo está disponible cuando no hay usuarios. Use login y POST /api/users' 
            });
        }

        // Usar el controller createUser pero con req.user simulado
        req.user = {
            tenantId: tenantId,
            role: role,
            userId: 'system'
        };
        req.body.name = name;
        req.body.role = role;
        
        return UserController.createUser(req, res);
    } catch (error) {
        return res.status(500).json({ 
            message: 'Error en bootstrap',
            error: error.message 
        });
    }
});

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
