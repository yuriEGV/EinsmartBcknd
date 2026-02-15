import express from 'express';
import enrollmentController from '../controllers/enrollmentController.js';
import upload from '../middleware/uploadMiddleware.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read Routes - Authenticated Users
router.get('/', enrollmentController.getEnrollments);
router.get('/estudiante/:estudianteId', enrollmentController.getEnrollmentsByStudent);
router.get('/course/:courseId', enrollmentController.getEnrollmentsByCourse);
router.get('/tenant/:tenantId', enrollmentController.getEnrollmentsByTenant);
router.get('/period/:period', enrollmentController.getEnrollmentsByPeriod);
router.get('/:id', enrollmentController.getEnrollmentById);

/* Restricted Routes: Admin, Sostenedor, Teacher */
const STAFF_ROLES = ['admin', 'sostenedor', 'director', 'teacher', 'utp'];

// Create
router.post('/', authorizeRoles(...STAFF_ROLES), upload.array('documents'), enrollmentController.createEnrollment);

// Update
router.put('/:id', authorizeRoles(...STAFF_ROLES), enrollmentController.updateEnrollment);

// Add Docs
router.post('/:id/documents', authorizeRoles(...STAFF_ROLES), upload.array('documents'), enrollmentController.addDocuments);

// Delete
router.delete('/:id', authorizeRoles(...STAFF_ROLES), enrollmentController.deleteEnrollment);

// Consolidated List for Sostenedor
router.post('/send-institutional-list', authMiddleware, enrollmentController.sendInstitutionalList);

// [NUEVO] Reporte resumen de matrículas para directivos
router.post('/trigger-summary', authMiddleware, enrollmentController.triggerSummaryReport);

export default router;
