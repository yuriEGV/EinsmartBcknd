
import express from 'express';
import RubricController from '../controllers/rubricController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('admin', 'director', 'teacher', 'utp'), RubricController.create);
router.get('/', RubricController.list);
router.get('/:id', RubricController.getById);
router.put('/:id', authorizeRoles('admin', 'teacher'), RubricController.update);
router.delete('/:id', authorizeRoles('admin', 'teacher'), RubricController.delete);

// Workflow routes
router.post('/:id/submit', authorizeRoles('teacher'), RubricController.submit);
router.post('/:id/review', authorizeRoles('admin', 'director', 'utp'), RubricController.review);

export default router;
