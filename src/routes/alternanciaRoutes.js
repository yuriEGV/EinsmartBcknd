import express from 'express';
import * as alternanciaController from '../controllers/alternanciaController.js';

const router = express.Router();

router.get('/', alternanciaController.getAlternancias);
router.post('/', alternanciaController.createAlternancia);
router.get('/gps/monitoring', alternanciaController.getActiveLocations);
router.get('/:id', alternanciaController.getAlternanciaById);
router.get('/estudiante/:estudianteId', alternanciaController.getAlternanciasByEstudiante);
router.put('/:id', alternanciaController.updateAlternancia);
router.delete('/:id', alternanciaController.deleteAlternancia);

// Nuevos endpoints de bitacora y PIN/GPS
router.post('/:id/bitacora', alternanciaController.addBitacoraEntry);
router.put('/:id/bitacora/:bitacoraId/sign', alternanciaController.signBitacoraEntry);
router.post('/:id/gps', alternanciaController.recordLocation);

export default router;
