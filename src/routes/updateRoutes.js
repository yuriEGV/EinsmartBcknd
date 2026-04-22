import express from 'express';
import UpdateController from '../controllers/updateController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Check for updates (Staff roles)
router.get(
    '/check',
    authorizeRoles('admin', 'sostenedor', 'director', 'utp', 'inspector_general', 'secretary', 'secretaria'),
    UpdateController.checkUpdates
);

// Run update script (Only top admins)
router.post(
    '/run',
    authorizeRoles('admin', 'sostenedor', 'director'),
    UpdateController.runUpdate
);

export default router;
