import express from 'express';
import EmpresaController from '../controllers/empresaController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all empresas
router.get('/', authMiddleware, EmpresaController.getEmpresas);

// Create empresa (only teachers, UTP, directors, admins)
router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'teacher'),
    EmpresaController.createEmpresa
);

// Update empresa
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'teacher'),
    EmpresaController.updateEmpresa
);

// Delete empresa
router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor', 'director', 'utp'),
    EmpresaController.deleteEmpresa
);

export default router;
