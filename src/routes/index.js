import express from 'express';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

// Import all routes
import estudianteRoutes from './estudianteRoutes.js';
import authRoutes from './authRoutes.js';
import reportRoutes from './reportRoutes.js';
import courseRoutes from './courseRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import evaluationRoutes from './evaluationRoutes.js';
import gradeRoutes from './gradeRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';
import userRoutes from './userRoutes.js';
import tenantRoutes from './tenantRoutes.js';
import apoderadoRoutes from './apoderadoRoutes.js';
import anotacionRoutes from './anotacionRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import tariffRoutes from './tariffRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import eventRoutes from './eventRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import messageRoutes from './messageRoutes.js';
import curriculumMaterialsRoutes from './curriculumMaterialsRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import objectiveRoutes from './objectiveRoutes.js';
import classLogRoutes from './classLogRoutes.js';
import questionRoutes from './questionRoutes.js';
import adminDayRoutes from './adminDayRoutes.js';
import userNotificationRoutes from './userNotificationRoutes.js';
import eventRequestRoutes from './eventRequestRoutes.js';
import careerRoutes from './careerRoutes.js';
import planningRoutes from './planningRoutes.js'; // [NEW] Added planningRoutes back
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV
  });
});

// Auth routes (some are public)
router.use('/auth', authRoutes);

// Protected routes (require valid token)
router.use(authMiddleware);

// Core Pedagogy
router.use('/estudiantes', estudianteRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/grades', gradeRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/class-logs', classLogRoutes);
router.use('/anotaciones', anotacionRoutes);
router.use('/objectives', objectiveRoutes);
router.use('/curriculum-materials', curriculumMaterialsRoutes);
router.use('/questions', questionRoutes);
router.use('/planning', planningRoutes);

// Administrative
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/apoderados', apoderadoRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/admin-days', adminDayRoutes);
router.use('/event-requests', eventRequestRoutes);

// Financial
router.use('/payments', paymentRoutes);
router.use('/tariffs', tariffRoutes);
router.use('/webhooks', webhookRoutes);

// Communication & Events
router.use('/messages', messageRoutes);
router.use('/events', eventRoutes);
router.use('/user-notifications', userNotificationRoutes);

// Misc
router.use('/careers', careerRoutes);

export default router;
