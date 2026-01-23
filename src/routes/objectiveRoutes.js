
import express from 'express';
import ObjectiveController from '../controllers/objectiveController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, ObjectiveController.createObjective);
router.get('/', authMiddleware, ObjectiveController.getObjectives);
router.put('/:id', authMiddleware, ObjectiveController.updateObjective);
router.delete('/:id', authMiddleware, ObjectiveController.deleteObjective);

export default router;
