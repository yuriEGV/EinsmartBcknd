import express from 'express';
import evaluationController from '../controllers/evaluationController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new evaluation
router.post('/', authMiddleware, authorizeRoles('admin', 'sostenedor', 'director', 'teacher', 'utp'), evaluationController.createEvaluation);

// Submit for review
router.post('/:id/submit', authMiddleware, authorizeRoles('teacher'), evaluationController.submitEvaluation);

// Review evaluation (UTP/Director/Admin)
router.post('/:id/review', authMiddleware, authorizeRoles('admin', 'director', 'utp'), evaluationController.reviewEvaluation);

// Get all evaluations
router.get('/', authMiddleware, evaluationController.getEvaluations);

// Get evaluations by course
router.get('/course/:courseId', authMiddleware, evaluationController.getEvaluationsByCourse);

// Get evaluations by tenant
router.get('/tenant/:tenantId', authMiddleware, evaluationController.getEvaluationsByTenant);

// Get a single evaluation by ID
router.get('/:id', authMiddleware, evaluationController.getEvaluationById);

// [NEW] Get evaluation for printing (PDF)
router.get('/:id/print', authMiddleware, evaluationController.printEvaluation);

// Update an evaluation by ID
router.put('/:id', authMiddleware, authorizeRoles('admin', 'sostenedor', 'director', 'teacher', 'utp'), evaluationController.updateEvaluation);

// Delete an evaluation by ID
router.delete('/:id', authMiddleware, authorizeRoles('admin', 'sostenedor', 'director', 'utp'), evaluationController.deleteEvaluation);

export default router;
