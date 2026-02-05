import express from 'express';
import QuestionController from '../controllers/questionController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', QuestionController.create);
router.get('/', QuestionController.list);
router.put('/:id', QuestionController.update);
router.delete('/:id', QuestionController.delete);

export default router;
