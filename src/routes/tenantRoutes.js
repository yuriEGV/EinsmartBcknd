import express from 'express';
import tenantController from '../controllers/tenantController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protegidas
router.use(authMiddleware);

// Crear Tenant - Solo Admin o Sostenedor
router.post('/', authorizeRoles('admin', 'sostenedor'), tenantController.createTenant);

router.get('/', tenantController.getTenants);
// Mi Institución (Configuración para Sostenedores)
router.get('/my', tenantController.getMyTenant);
router.put('/my', authorizeRoles('admin', 'sostenedor'), tenantController.updateMyTenant);

router.get('/:id', tenantController.getTenantById);

// Update/Delete - Solo Admin o Sostenedor
router.put('/:id', authorizeRoles('admin', 'sostenedor'), tenantController.updateTenant);
router.delete('/:id', authorizeRoles('admin', 'sostenedor'), tenantController.deleteTenant);

export default router;
