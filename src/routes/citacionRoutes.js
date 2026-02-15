import express from 'express';
import CitacionController from '../controllers/citacionController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', CitacionController.create);
router.get('/', CitacionController.list);
router.patch('/:id/status', CitacionController.updateStatus);

export default router;
