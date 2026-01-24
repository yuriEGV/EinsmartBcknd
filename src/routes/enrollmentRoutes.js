import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import upload from '../middleware/uploadMiddleware.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ... existing routes ...

router.post('/send-institutional-list', authMiddleware, enrollmentController.sendInstitutionalList);

export default router;
