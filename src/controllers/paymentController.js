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
    const query = (req.user.role === 'admin')
      ? {}
      : { tenantId: req.user.tenantId };

    const payments = await Payment.find(query);
    res.json(payments);
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


