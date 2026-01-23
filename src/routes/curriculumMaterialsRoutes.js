const express = require('express');
const router = express.Router();
const curriculumMaterialsController = require('../controllers/curriculumMaterialsController');

// Define the routes
router.post('/', curriculumMaterialsController.create);
router.get('/', curriculumMaterialsController.getAll);
router.put('/:id', curriculumMaterialsController.update);
router.delete('/:id', curriculumMaterialsController.delete);
router.get('/course/:courseId', curriculumMaterialsController.getByCourse);
router.get('/subject/:subjectId', curriculumMaterialsController.getBySubject);

module.exports = router;