
import express from 'express';
import PlanningController from '../controllers/planningController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

// Base authorization items
const STAFF_ROLES = ['admin', 'sostenedor', 'director', 'teacher', 'utp'];
const REVIEW_ROLES = ['admin', 'sostenedor', 'director', 'utp'];

router.post('/', authMiddleware, authorizeRoles(...STAFF_ROLES), PlanningController.create);
router.get('/', authMiddleware, authorizeRoles(...STAFF_ROLES), PlanningController.list);
router.put('/:id', authMiddleware, authorizeRoles(...STAFF_ROLES), PlanningController.update);
router.delete('/:id', authMiddleware, authorizeRoles(...STAFF_ROLES), PlanningController.delete);

router.post('/:id/submit', authMiddleware, PlanningController.submit);
router.post('/:id/review', authMiddleware, authorizeRoles(...REVIEW_ROLES), PlanningController.review);

export default router;
