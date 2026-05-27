import express from 'express';
import EmpresaController from '../controllers/empresaController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';
import { verifyHeadTeacherOrHigher } from '../middleware/verifyHeadTeacher.js';

const router = express.Router();

// Get all empresas
router.get('/', authMiddleware, EmpresaController.getEmpresas);

// Create empresa (only teachers, UTP, directors, admins)
router.post(
    '/',
    authMiddleware,
    verifyHeadTeacherOrHigher,
    EmpresaController.createEmpresa
);

// Update empresa
router.put(
    '/:id',
    authMiddleware,
    verifyHeadTeacherOrHigher,
    EmpresaController.updateEmpresa
);

// Delete empresa
router.delete(
    '/:id',
    authMiddleware,
    verifyHeadTeacherOrHigher,
    EmpresaController.deleteEmpresa
);

export default router;
