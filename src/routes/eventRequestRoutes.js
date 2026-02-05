import express from 'express';
import EventRequestController from '../controllers/eventRequestController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', EventRequestController.createRequest);
router.get('/my', EventRequestController.getMyRequests);
router.get('/', EventRequestController.getAllRequests);
router.patch('/:id/status', EventRequestController.updateStatus);
router.delete('/:id', EventRequestController.deleteRequest);

export default router;
