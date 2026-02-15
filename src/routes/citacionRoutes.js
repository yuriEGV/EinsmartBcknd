import express from 'express';
import CitacionController from '../controllers/citacionController.js';

const router = express.Router();

router.post('/', CitacionController.create);
router.get('/', CitacionController.list);
router.patch('/:id/status', CitacionController.updateStatus);

export default router;
