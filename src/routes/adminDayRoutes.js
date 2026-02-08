import express from 'express';
import adminDayController from '../controllers/adminDayController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/requests', adminDayController.createRequest);
router.get('/my-requests', adminDayController.getMyRequests);
router.get('/all', authorizeRoles('admin', 'sostenedor', 'director'), adminDayController.getAllRequests);
router.get('/stats', adminDayController.getStats);
router.get('/ranking', authorizeRoles('admin', 'sostenedor', 'director'), adminDayController.getRanking);
router.put('/:id/status', authorizeRoles('admin', 'sostenedor', 'director'), adminDayController.updateStatus);

export default router;
