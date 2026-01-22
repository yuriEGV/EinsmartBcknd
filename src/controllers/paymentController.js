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
}

export default PaymentController;


