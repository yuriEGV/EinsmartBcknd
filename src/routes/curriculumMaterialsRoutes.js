import express from 'express';
import { create, getAll, update, deleteOne, getByCourse, getBySubject } from '../controllers/curriculumMaterialsController.js';
import upload from '../middleware/uploadMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Define the routes
router.post('/', upload.single('file'), create);
router.get('/', getAll);
router.put('/:id', upload.single('file'), update);
router.delete('/:id', deleteOne);
router.get('/course/:courseId', getByCourse);
router.get('/subject/:subjectId', getBySubject);

export default router;