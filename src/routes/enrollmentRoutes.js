import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import upload from '../middleware/uploadMiddleware.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read Routes - Authenticated Users (Everyone can see enrollments? Maybe strict? 
// For now, let's allow read for all authenticated, assuming controller filters)
router.get('/', enrollmentController.getEnrollments);
router.get('/estudiante/:estudianteId', enrollmentController.getEnrollmentsByStudent);
router.get('/course/:courseId', enrollmentController.getEnrollmentsByCourse);
router.get('/tenant/:tenantId', enrollmentController.getEnrollmentsByTenant);
router.get('/period/:period', enrollmentController.getEnrollmentsByPeriod);
router.get('/:id', enrollmentController.getEnrollmentById);

/* Restricted Routes: Admin, Sostenedor, Teacher */
const STAFF_ROLES = ['admin', 'sostenedor', 'teacher'];

// Create
router.post('/', authorizeRoles(...STAFF_ROLES), upload.array('documents'), enrollmentController.createEnrollment);

// Update
router.put('/:id', authorizeRoles(...STAFF_ROLES), enrollmentController.updateEnrollment);

// Add Docs
router.post('/:id/documents', authorizeRoles(...STAFF_ROLES), upload.array('documents'), enrollmentController.addDocuments);

// Delete
router.delete('/:id', authorizeRoles(...STAFF_ROLES), enrollmentController.deleteEnrollment);

export default router;
