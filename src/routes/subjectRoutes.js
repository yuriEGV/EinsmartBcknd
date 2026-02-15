
import express from 'express';
import SubjectController from '../controllers/subjectController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get is open to all authenticated users (students need to see their subjects)
router.get('/', authMiddleware, SubjectController.getSubjects);

// Manage: Admin, Sostenedor, Teacher, Director, UTP
router.post('/', authMiddleware, authorizeRoles('admin', 'sostenedor', 'teacher', 'director', 'utp'), SubjectController.createSubject);
router.put('/:id', authMiddleware, authorizeRoles('admin', 'sostenedor', 'teacher', 'director', 'utp'), SubjectController.updateSubject);
router.delete('/:id', authMiddleware, authorizeRoles('admin', 'sostenedor', 'teacher', 'director', 'utp'), SubjectController.deleteSubject);

export default router;
