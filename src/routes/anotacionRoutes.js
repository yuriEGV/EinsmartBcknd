import express from 'express';
import anotacionController from '../controllers/anotacionController.js';

const router = express.Router();

// Create a new anotacion
router.post('/', anotacionController.createAnotacion);

// Get all anotaciones (with optional filters: ?tipo=positiva&estudianteId=xxx)
router.get('/', anotacionController.getAnotaciones);

// Get estadísticas de anotaciones de un estudiante
router.get('/estadisticas/estudiante/:estudianteId', anotacionController.getEstadisticasByEstudiante);

// Get anotaciones by estudiante (with optional filter: ?tipo=positiva)
router.get('/estudiante/:estudianteId', anotacionController.getAnotacionesByEstudiante);

// Get a single anotacion by ID
router.get('/:id', anotacionController.getAnotacionById);

// Update an anotacion by ID
router.put('/:id', anotacionController.updateAnotacion);

// Delete an anotacion by ID
router.delete('/:id', anotacionController.deleteAnotacion);

export default router;

