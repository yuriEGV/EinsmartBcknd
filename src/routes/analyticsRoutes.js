import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get student analytics (averages by subject and overall)
router.get('/students', analyticsController.getStudentAnalytics);

// Get top students (best overall averages)
router.get('/top-students', analyticsController.getTopStudents);

// Get annotation rankings (positive/negative)
router.get('/annotations-ranking', analyticsController.getAnnotationRankings);

// Get individual student performance
router.get('/student/:studentId', analyticsController.getStudentPerformance);

// Get dashboard main stats
router.get('/dashboard-stats', analyticsController.getDashboardStats);

export default router;
