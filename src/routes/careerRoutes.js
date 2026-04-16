
import express from 'express';
import CareerController from '../controllers/careerController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'inspector_general'), CareerController.createCareer);
router.get('/', CareerController.getCareers);
router.put('/:id', authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'inspector_general'), CareerController.updateCareer);
router.delete('/:id', authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'inspector_general'), CareerController.deleteCareer);

export default router;
