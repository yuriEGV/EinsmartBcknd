import express from 'express';
import LogController from '../controllers/logController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/class-book', LogController.logAccess);
router.get('/class-book', LogController.getLogs);

export default router;
