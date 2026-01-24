import express from 'express';
import PaymentController from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Crear pago AUTOMÁTICO desde tarifa
 */
router.post('/', authMiddleware, PaymentController.createPayment);

/**
 * Listar pagos del tenant
 */
router.get('/', authMiddleware, PaymentController.listPayments);

/**
 * Obtener pago por ID
 */
router.get('/:id', authMiddleware, PaymentController.getPaymentById);

/**
 * Asignar cobro masivo (Especial para Sostenedores)
 */
/**
 * Estadísticas de Deuda
 */
router.get('/stats/debt', authMiddleware, PaymentController.getDebtStats);

router.post('/bulk-assign', authMiddleware, PaymentController.assignBulkTariff);

export default router;
