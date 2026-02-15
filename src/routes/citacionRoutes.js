import express from 'express';
import CitacionController from '../controllers/citacionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', CitacionController.create);
router.get('/', CitacionController.list);
router.patch('/:id/status', CitacionController.updateStatus);

export default router;
