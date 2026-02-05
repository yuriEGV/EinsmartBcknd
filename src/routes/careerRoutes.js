
import express from 'express';
import CareerController from '../controllers/careerController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', CareerController.createCareer);
router.get('/', CareerController.getCareers);
router.put('/:id', CareerController.updateCareer);
router.delete('/:id', CareerController.deleteCareer);

export default router;
