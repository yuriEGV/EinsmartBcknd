import express from 'express';
import EmpresaController from '../controllers/empresaController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';
import { verifyHeadTeacherOrHigher } from '../middleware/verifyHeadTeacher.js';

const router = express.Router();

// Get all empresas
router.get('/', authMiddleware, EmpresaController.getEmpresas);

// Create empresa (only director, UTP, jefe_carrera, admins)
router.post(
    '/',
    authMiddleware,
    authorizeRoles('director', 'utp', 'jefe_carrera', 'admin', 'sostenedor'),
    EmpresaController.createEmpresa
);

// Update empresa
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('director', 'utp', 'jefe_carrera', 'admin', 'sostenedor'),
    EmpresaController.updateEmpresa
);

// Delete empresa
router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('director', 'utp', 'jefe_carrera', 'admin', 'sostenedor'),
    EmpresaController.deleteEmpresa
);

export default router;
