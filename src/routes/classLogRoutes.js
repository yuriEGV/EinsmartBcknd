import express from 'express';
import ClassLogController from '../controllers/classLogController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', ClassLogController.create);
router.get('/', ClassLogController.list);
router.post('/:id/sign', ClassLogController.sign);
router.delete('/:id', ClassLogController.delete);

export default router;
