import express from 'express';
import CurriculumController from '../controllers/curriculumController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/populate-tp', CurriculumController.populateTechnicalCurriculum);
router.get('/report-tp/:courseId', CurriculumController.getTechnicalCurriculumReport);

export default router;
