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

export default router;
