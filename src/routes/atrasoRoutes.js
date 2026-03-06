import express from 'express';
import * as atrasoController from '../controllers/atrasoController.js';

const router = express.Router();

router.get('/', atrasoController.getAtrasos);
router.post('/', atrasoController.createAtraso);
router.get('/estudiante/:estudianteId', atrasoController.getAtrasosByEstudiante);
router.put('/:id', atrasoController.updateAtraso);
router.delete('/:id', atrasoController.deleteAtraso);

export default router;
