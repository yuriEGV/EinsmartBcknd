import express from 'express';
import * as alternanciaController from '../controllers/alternanciaController.js';

const router = express.Router();

router.get('/', alternanciaController.getAlternancias);
router.post('/', alternanciaController.createAlternancia);
router.get('/:id', alternanciaController.getAlternanciaById);
router.get('/estudiante/:estudianteId', alternanciaController.getAlternanciasByEstudiante);
router.put('/:id', alternanciaController.updateAlternancia);
router.delete('/:id', alternanciaController.deleteAlternancia);

export default router;
