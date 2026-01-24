
import express from 'express';
import notificationController from '../controllers/notificationController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Send payment reminder (Admin/Sostenedor/Secretary)
router.post(
    '/payment-reminder',
    authorizeRoles('admin', 'sostenedor', 'secretary'),
    notificationController.sendPaymentReminder
);

export default router;
