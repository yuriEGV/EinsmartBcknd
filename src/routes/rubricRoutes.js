
import express from 'express';
import RubricController from '../controllers/rubricController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', RubricController.create);
router.get('/', RubricController.list);
router.get('/:id', RubricController.getById);
router.put('/:id', RubricController.update);
router.delete('/:id', RubricController.delete);

export default router;
