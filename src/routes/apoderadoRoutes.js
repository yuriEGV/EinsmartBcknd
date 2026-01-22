import express from 'express';
import apoderadoController from '../controllers/apoderadoController.js';
import auth from '../middleware/authMiddleware.js'; // <-- IMPORTANTE

const router = express.Router();

// 🔥 Todas las rutas protegidas
router.use(auth);

// Create a new apoderado
router.post('/', apoderadoController.createApoderado);

// Get all apoderados
router.get('/', apoderadoController.getApoderados);

// Get apoderados by estudiante
router.get('/estudiante/:estudianteId', apoderadoController.getApoderadosByEstudiante);

// Get a single apoderado by ID
router.get('/:id', apoderadoController.getApoderadoById);

// Update an apoderado by ID
router.put('/:id', apoderadoController.updateApoderado);

// Delete an apoderado by ID
router.delete('/:id', apoderadoController.deleteApoderado);

export default router;
