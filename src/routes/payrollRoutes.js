import express from 'express';
import PayrollController from '../controllers/payrollController.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/* ===============================
   RUTAS DE GESTIÓN DE NÓMINAS (PAGOS A PERSONAL)
   Protegidas para roles 'admin' y 'sostenedor'
================================ */

// Crear un nuevo pago de nómina
router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    PayrollController.createPayrollPayment
);

// Obtener todos los pagos de nómina (filtrado por tenant/userId)
router.get(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    PayrollController.getPayrollPayments
);

// Obtener un pago de nómina por ID
router.get(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    PayrollController.getPayrollPaymentById
);

// Actualizar un pago de nómina por ID
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    PayrollController.updatePayrollPayment
);

// Eliminar un pago de nómina por ID
router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'sostenedor'),
    PayrollController.deletePayrollPayment
);

export default router;
