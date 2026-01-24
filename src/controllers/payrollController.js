import PayrollPayment from '../models/payrollPaymentModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

class PayrollController {

    static async createPayrollPayment(req, res) {
        try {
            const { userId, amount, currency, paymentDate, period, concept, status } = req.body;
            const tenantId = req.user.tenantId; // Obtenido del token de autenticación

            if (!userId || !amount || !paymentDate || !period) {
                return res.status(400).json({ message: 'userId, amount, paymentDate y period son obligatorios.' });
            }

            // Verificar que el userId pertenezca al mismo tenant o si es SuperAdmin
            const targetUser = await User.findById(userId);
            if (!targetUser) {
                return res.status(404).json({ message: 'Usuario a pagar no encontrado.' });
            }
            if (req.user.role !== 'admin' && targetUser.tenantId.toString() !== tenantId.toString()) {
                return res.status(403).json({ message: 'No tienes permisos para pagar a este usuario.' });
            }

            const newPayment = await PayrollPayment.create({
                tenantId,
                userId,
                amount,
                currency,
                paymentDate,
                period,
                concept,
                status
            });

            res.status(201).json(newPayment);
        } catch (error) {
            console.error('Error creating payroll payment:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async getPayrollPayments(req, res) {
        try {
            const query = {};
            // Solo administradores pueden ver de todos los tenants si se especifica tenantId en query
            if (req.user.role === 'admin' && req.query.tenantId) {
                query.tenantId = req.query.tenantId;
            } else { // Sostenedores y otros roles solo ven los de su tenant
                query.tenantId = req.user.tenantId;
            }

            // Filtrar por userId si se especifica
            if (req.query.userId) {
                query.userId = req.query.userId;
            }

            const payments = await PayrollPayment.find(query)
                .populate('userId', 'name email role') // Obtener info del usuario al que se le paga
                .sort({ paymentDate: -1 });

            res.status(200).json(payments);
        } catch (error) {
            console.error('Error getting payroll payments:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async getPayrollPaymentById(req, res) {
        try {
            const { id } = req.params;
            const query = { _id: id };

            // Solo administradores pueden ver de cualquier tenant si se especifica tenantId en query
            if (req.user.role === 'admin' && req.query.tenantId) {
                query.tenantId = req.query.tenantId;
            } else { // Sostenedores y otros roles solo ven los de su tenant
                query.tenantId = req.user.tenantId;
            }

            const payment = await PayrollPayment.findOne(query).populate('userId', 'name email role');

            if (!payment) {
                return res.status(404).json({ message: 'Pago de nómina no encontrado.' });
            }

            res.status(200).json(payment);
        } catch (error) {
            console.error('Error getting payroll payment by ID:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async updatePayrollPayment(req, res) {
        try {
            const { id } = req.params;
            const { userId, amount, currency, paymentDate, period, concept, status } = req.body;
            const tenantId = req.user.tenantId;

            const updateData = {
                userId,
                amount,
                currency,
                paymentDate,
                period,
                concept,
                status
            };

            const query = { _id: id };
            if (req.user.role !== 'admin') {
                query.tenantId = tenantId;
            }

            const updatedPayment = await PayrollPayment.findOneAndUpdate(query, updateData, { new: true });

            if (!updatedPayment) {
                return res.status(404).json({ message: 'Pago de nómina no encontrado para actualizar.' });
            }

            res.status(200).json(updatedPayment);
        } catch (error) {
            console.error('Error updating payroll payment:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async deletePayrollPayment(req, res) {
        try {
            const { id } = req.params;
            const query = { _id: id };

            if (req.user.role !== 'admin') {
                query.tenantId = req.user.tenantId;
            }

            const deletedPayment = await PayrollPayment.findOneAndDelete(query);

            if (!deletedPayment) {
                return res.status(404).json({ message: 'Pago de nómina no encontrado para eliminar.' });
            }

            res.status(204).send(); // No content
        } catch (error) {
            console.error('Error deleting payroll payment:', error);
            res.status(500).json({ message: error.message });
        }
    }

}

export default PayrollController;
