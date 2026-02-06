
import express from 'express';
import CareerController from '../controllers/careerController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('admin', 'sostenedor', 'director'), CareerController.createCareer);
router.get('/', CareerController.getCareers);
router.put('/:id', authorizeRoles('admin', 'sostenedor', 'director'), CareerController.updateCareer);
router.delete('/:id', authorizeRoles('admin', 'sostenedor', 'director'), CareerController.deleteCareer);

export default router;
