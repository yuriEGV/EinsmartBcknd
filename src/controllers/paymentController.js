import Payment from '../models/paymentModel.js';
import Tariff from '../models/tariffModel.js';
import paymentService from '../services/paymentService.js';

class PaymentController {

  static async createPayment(req, res) {
    try {
      const { estudianteId, apoderadoId, tariffId, provider, metadata } = req.body;
      const tenantId = req.user.tenantId;

      if (!estudianteId || !tariffId) {
        return res.status(400).json({
          message: 'estudianteId y tariffId son obligatorios'
        });
      }

      // Delegate to PaymentService which handles MP integration
      const result = await paymentService.createPaymentFromTariff({
        tenantId,
        estudianteId,
        tariffId,
        provider: provider || 'manual', // default to manual/transfer if not specified? Or enforce?
        // If provider is 'mercadopago', service handles preference creation
        metadata: { ...metadata, apoderadoId }
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  static async listPayments(req, res) {
    try {
      const query = (req.user.role === 'admin')
        ? {}
        : { tenantId: req.user.tenantId };

      if (req.user.role === 'student' && req.user.profileId) {
        query.estudianteId = req.user.profileId;
      } else if (req.user.role === 'apoderado' && req.user.profileId) {
        const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
        const vinculation = await Apoderado.findById(req.user.profileId);
        if (vinculation) {
          query.estudianteId = vinculation.estudianteId;
        } else {
          return res.status(200).json([]);
        }
      } else if (req.user.role === 'student' || req.user.role === 'apoderado') {
        return res.status(200).json([]);
      }

      const payments = await Payment.find(query)
        .populate('estudianteId', 'nombres apellidos')
        .populate('tariffId', 'name amount');
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getPaymentById(req, res) {
    const payment = await Payment.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    res.json(payment);
  }

  static async assignBulkTariff(req, res) {
    try {
      const { courseId, tariffId, studentIds, dueDate, metadata } = req.body;
      const tenantId = req.user.tenantId;

      if (!tariffId) {
        return res.status(400).json({ message: 'tariffId es obligatorio' });
      }

      const Tariff = await import('../models/tariffModel.js').then(m => m.default);
      const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
      const Payment = await import('../models/paymentModel.js').then(m => m.default);

      const tariff = await Tariff.findOne({ _id: tariffId, tenantId });
      if (!tariff) return res.status(404).json({ message: 'Tarifa no encontrada' });

      let targetStudentIds = studentIds || [];

      // If courseId is provided, get all enrolled students in that course
      if (courseId) {
        const enrollments = await Enrollment.find({
          courseId,
          tenantId,
          status: 'confirmada'
        }).select('estudianteId');

        const courseStudentIds = enrollments.map(e => e.estudianteId.toString());
        targetStudentIds = [...new Set([...targetStudentIds, ...courseStudentIds])];
      }

      if (targetStudentIds.length === 0) {
        return res.status(400).json({ message: 'No se encontraron alumnos para asignar el cobro' });
      }

      const paymentsToCreate = targetStudentIds.map(sid => ({
        tenantId,
        estudianteId: sid,
        tariffId: tariff._id,
        amount: tariff.amount,
        currency: tariff.currency || 'CLP',
        status: 'vencido', // Typically bulk assignment creates a debt
        fechaVencimiento: dueDate ? new Date(dueDate) : new Date(),
        metadata: { ...metadata, bulkAssign: true }
      }));

      // Avoid duplicates for the same student, same tariff, same month? 
      // For now, simple bulk insert.
      const result = await Payment.insertMany(paymentsToCreate);

      res.status(201).json({
        message: `Se han generado ${result.length} cobros exitosamente.`,
        count: result.length
      });

    } catch (error) {
      console.error('Bulk assign error:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

export default PaymentController;


