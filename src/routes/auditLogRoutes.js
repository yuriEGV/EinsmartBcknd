import express from 'express';
import AuditLogController from '../controllers/auditLogController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin/sostenedor (fiscalizadores) can see logs
router.get('/', authorizeRoles('admin', 'sostenedor'), AuditLogController.getLogs);

export default router;
