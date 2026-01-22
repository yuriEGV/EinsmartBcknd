import express from 'express';
import EventController from '../controllers/eventController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', EventController.getEvents);
router.post('/', authorizeRoles('admin', 'sostenedor', 'teacher'), EventController.createEvent);
router.delete('/:id', authorizeRoles('admin', 'sostenedor'), EventController.deleteEvent);

export default router;
