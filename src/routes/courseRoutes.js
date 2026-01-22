import express from 'express';
import CourseController from '../controllers/courseController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public/Read-only (or Student/Guardian/Teacher/Admin)
// Assuming authMiddleware is applied in index.js for /courses
// If not, we rely on index.js logic. (index.js says `router.use(authMiddleware)` before /courses)

// Get all courses & by ID - Open to all Authenticated
router.get('/', CourseController.getCourses);
router.get('/tenant/:tenantId', CourseController.getCoursesByTenant);
router.get('/:id', CourseController.getCourseById);

// Restricted: Create/Update/Delete -> Admin, Sostenedor, Teacher
router.post('/', authorizeRoles('admin', 'sostenedor', 'teacher'), CourseController.createCourse);
router.put('/:id', authorizeRoles('admin', 'sostenedor', 'teacher'), CourseController.updateCourse);
router.delete('/:id', authorizeRoles('admin', 'sostenedor', 'teacher'), CourseController.deleteCourse);

export default router;
