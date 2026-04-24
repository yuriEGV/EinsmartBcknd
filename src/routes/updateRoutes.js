import express from 'express';
import UpdateController from '../controllers/updateController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Check for updates
router.get(
    '/check',
    UpdateController.checkUpdates
);

// Run update script
router.post(
    '/run',
    UpdateController.runUpdate
);

export default router;
