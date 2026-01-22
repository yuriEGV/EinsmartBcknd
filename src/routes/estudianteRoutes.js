import express from 'express';
import estudianteController from '../controllers/estudianteController.js';

import { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

const STAFF_ROLES = ['admin', 'sostenedor', 'teacher'];

// Create a new estudiante
router.post('/', authorizeRoles(...STAFF_ROLES), estudianteController.createEstudiante);

// Get all estudiantes (Authenticated users can view, maybe restrict later if needed)
router.get('/', estudianteController.getEstudiantes);

// Get a single estudiante by ID
router.get('/:id', estudianteController.getEstudianteById);

// Update an estudiante by ID
router.put('/:id', authorizeRoles(...STAFF_ROLES), estudianteController.updateEstudiante);

// Delete an estudiante by ID
router.delete('/:id', authorizeRoles(...STAFF_ROLES), estudianteController.deleteEstudiante);

export default router;