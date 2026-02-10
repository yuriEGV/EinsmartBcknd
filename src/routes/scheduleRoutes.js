import express from 'express';
import ScheduleController from '../controllers/scheduleController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', ScheduleController.list);
router.get('/course/:courseId', ScheduleController.getByDay);
router.post('/', authorizeRoles('admin', 'utp', 'director'), ScheduleController.create);
router.delete('/:id', authorizeRoles('admin', 'utp', 'director'), ScheduleController.delete);

export default router;
