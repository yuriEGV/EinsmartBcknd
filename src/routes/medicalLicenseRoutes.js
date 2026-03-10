import express from 'express';
import MedicalLicenseController from '../controllers/medicalLicenseController.js';
import authenticate from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', MedicalLicenseController.create);
router.get('/', MedicalLicenseController.list);
router.get('/:id', MedicalLicenseController.getById);
router.put('/:id', MedicalLicenseController.updateStatus);
router.delete('/:id', MedicalLicenseController.delete);

export default router;
