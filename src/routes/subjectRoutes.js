
import express from 'express';
import SubjectController from '../controllers/subjectController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get is open to all authenticated users (students need to see their subjects)
router.get('/', SubjectController.getSubjects);

// Manage: Admin, Sostenedor, Teacher
router.post('/', authorizeRoles('admin', 'sostenedor', 'teacher'), SubjectController.createSubject);
router.put('/:id', authorizeRoles('admin', 'sostenedor', 'teacher'), SubjectController.updateSubject);
router.delete('/:id', authorizeRoles('admin', 'sostenedor', 'teacher'), SubjectController.deleteSubject);

export default router;
