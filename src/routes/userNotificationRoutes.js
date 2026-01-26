import express from 'express';
import userNotificationController from '../controllers/userNotificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', userNotificationController.getMyNotifications);
router.put('/:id/read', userNotificationController.markAsRead);
router.put('/mark-all-read', userNotificationController.markAllAsRead);

export default router;
