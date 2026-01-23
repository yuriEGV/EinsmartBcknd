import express from 'express';
import { create, getAll, update, deleteOne, getByCourse, getBySubject } from '../controllers/curriculumMaterialsController.js';

const router = express.Router();

// Define the routes
router.post('/', create);
router.get('/', getAll);
router.put('/:id', update);
router.delete('/:id', deleteOne);
router.get('/course/:courseId', getByCourse);
router.get('/subject/:subjectId', getBySubject);

export default router;