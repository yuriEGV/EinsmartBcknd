import express from 'express';
import QuestionController from '../controllers/questionController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('admin', 'sostenedor', 'director', 'teacher', 'utp'), QuestionController.create);
router.get('/', QuestionController.list);
router.put('/:id', authorizeRoles('admin', 'sostenedor', 'director', 'teacher', 'utp'), QuestionController.update);
router.delete('/:id', authorizeRoles('admin', 'sostenedor', 'director', 'utp'), QuestionController.delete);

export default router;
