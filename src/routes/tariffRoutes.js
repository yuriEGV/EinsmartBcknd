/*import express from 'express';
import tariffController from '../controllers/tariffController.js';

const router = express.Router();

router.post('/', tariffController.createTariff);
router.get('/', tariffController.listTariffs);
router.get('/:id', tariffController.getTariff);
router.put('/:id', tariffController.updateTariff);
router.delete('/:id', tariffController.deleteTariff);

export default router;*/
import express from 'express';
import tariffController from '../controllers/tariffController.js';

const router = express.Router();

router.post('/', tariffController.createTariff);
router.get('/', tariffController.listTariffs);
router.get('/:id', tariffController.getTariff);
router.put('/:id', tariffController.updateTariff);
router.delete('/:id', tariffController.deleteTariff);

export default router;

