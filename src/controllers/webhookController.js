import Transaction from '../models/transactionModel.js';
import Payment from '../models/paymentModel.js';
import mercadoLibreService from '../services/mercadoLibreService.js';
import flowService from '../services/flowService.js';
import webpayService from '../services/webpayService.js';

class WebhookController {
  // Helper to map provider status to our Payment.status
  static mapStatus(provider, rawStatus) {
    if (!rawStatus) return null;
    const s = String(rawStatus).toLowerCase();
    if (['approved', 'paid', 'completed'].includes(s)) return 'paid';
    if (['pending', 'in_process', 'in_process_payment', 'pending_payment'].includes(s)) return 'pending';
    if (['rejected', 'cancelled', 'refunded', 'failure', 'failed'].includes(s)) return 'failed';
    return null;
  }

  // Public endpoint for Mercado Libre / MercadoPago webhooks
  static async mercadoLibreWebhook(req, res) {
    try {
      const verified = await mercadoLibreService.verifyWebhook(req.headers, req.body, req.rawBody);

      const tx = new Transaction({
        tenantId: req.body.tenantId || null,
        provider: 'mercadolibre',
        providerEventId: req.headers['x-mercadopago-notification'] || req.headers['x-ml-webhook-id'] || null,
        payload: req.body,
      });
      await tx.save();

      if (!verified) {
        tx.status = 'failed';
        await tx.save();
        return res.status(401).send('unverified');
      }

      // Try to extract a provider payment id / external reference and status
      let providerPaymentId = null;
      let providerStatus = null;

      if (req.body.data && req.body.data.id) {
        providerPaymentId = String(req.body.data.id);
      }

      if (req.body.id) providerPaymentId = String(req.body.id);

      if (req.body.collection) {
        if (req.body.collection.id) providerPaymentId = String(req.body.collection.id);
        if (req.body.collection.status) providerStatus = req.body.collection.status;
        if (req.body.collection.external_reference && !providerPaymentId) {
          // some integrations set external_reference to link to our system
          providerPaymentId = String(req.body.collection.external_reference);
        }
      }

      if (req.body.type) providerStatus = providerStatus || req.body.type;
      if (req.body.status) providerStatus = providerStatus || req.body.status;

      // Try to find matching Payment by providerPaymentId or by metadata external reference
      let payment = null;
      if (providerPaymentId) {
        payment = await Payment.findOne({ $or: [
          { providerPaymentId: providerPaymentId },
          { 'metadata.external_reference': providerPaymentId },
          { 'metadata.externalReference': providerPaymentId },
        ] });
      }

      // If we didn't find by id, try to match by other fields that providers may send
      if (!payment && req.body.collection && req.body.collection.external_reference) {
        const ext = String(req.body.collection.external_reference);
        payment = await Payment.findOne({ $or: [
          { 'metadata.external_reference': ext },
          { 'metadata.externalReference': ext }
        ] });
      }

      if (payment) {
        // Update providerPaymentId if missing
        if (providerPaymentId && !payment.providerPaymentId) {
          payment.providerPaymentId = providerPaymentId;
        }

        const mapped = WebhookController.mapStatus('mercadolibre', providerStatus || req.body.status || req.body.collection?.status);
        if (mapped) {
          payment.status = mapped;
        }
        await payment.save();
      }

      tx.status = 'processed';
      tx.processedAt = new Date();
      await tx.save();

      return res.status(200).send('ok');
    } catch (error) {
      console.error('Error webhook ML:', error);
      return res.status(500).send('error');
    }
  }

  // Public endpoint for Flow webhooks
  static async flowWebhook(req, res) {
    try {
      const verified = await flowService.verifyWebhook(req.headers, req.body, req.rawBody);

      const tx = new Transaction({
        tenantId: req.body.tenantId || null,
        provider: 'flow',
        providerEventId: req.headers['x-flow-event-id'] || req.body.id || null,
        payload: req.body,
      });
      await tx.save();

      if (!verified) {
        tx.status = 'failed';
        await tx.save();
        return res.status(401).send('unverified');
      }

      // Attempt to extract identifiers and status
      let providerPaymentId = req.body.paymentId || req.body.id || req.body.data?.id || req.body.reference || req.body.merchantPaymentId || null;
      let providerStatus = req.body.status || req.body.event || req.body.data?.status || null;

      let payment = null;
      if (providerPaymentId) {
        payment = await Payment.findOne({ $or: [
          { providerPaymentId: String(providerPaymentId) },
          { 'metadata.reference': String(providerPaymentId) }
        ] });
      }

      if (!payment && req.body.reference) {
        payment = await Payment.findOne({ 'metadata.reference': String(req.body.reference) });
      }

      if (payment) {
        if (providerPaymentId && !payment.providerPaymentId) payment.providerPaymentId = String(providerPaymentId);
        const mapped = WebhookController.mapStatus('flow', providerStatus);
        if (mapped) payment.status = mapped;
        await payment.save();
      }

      tx.status = 'processed';
      tx.processedAt = new Date();
      await tx.save();

      return res.status(200).send('ok');
    } catch (error) {
      console.error('Error webhook Flow:', error);
      return res.status(500).send('error');
    }
  }

  // Public endpoint for Webpay (Transbank) webhooks
  static async webpayWebhook(req, res) {
    try {
      const verified = await webpayService.verifyWebhook(req.headers, req.body, req.rawBody);

      const tx = new Transaction({
        tenantId: req.body.tenantId || null,
        provider: 'webpay',
        providerEventId: req.headers['x-webpay-event-id'] || req.body.id || null,
        payload: req.body,
      });
      await tx.save();

      if (!verified) {
        tx.status = 'failed';
        await tx.save();
        return res.status(401).send('unverified');
      }

      // Extract identifiers
      let providerPaymentId = req.body.transactionId || req.body.id || req.body.token || req.body.paymentId || null;
      let providerStatus = req.body.status || req.body.result || req.body.event || null;

      let payment = null;
      if (providerPaymentId) {
        payment = await Payment.findOne({ $or: [
          { providerPaymentId: String(providerPaymentId) },
          { 'metadata.reference': String(providerPaymentId) },
          { 'metadata.external_reference': String(providerPaymentId) }
        ] });
      }

      if (!payment && req.body.reference) {
        payment = await Payment.findOne({ $or: [
          { 'metadata.reference': String(req.body.reference) },
          { 'metadata.external_reference': String(req.body.reference) }
        ] });
      }

      if (payment) {
        if (providerPaymentId && !payment.providerPaymentId) payment.providerPaymentId = String(providerPaymentId);
        const mapped = WebhookController.mapStatus('webpay', providerStatus);
        if (mapped) payment.status = mapped;
        await payment.save();
      }

      tx.status = 'processed';
      tx.processedAt = new Date();
      await tx.save();

      return res.status(200).send('ok');
    } catch (error) {
      console.error('Error webhook Webpay:', error);
      return res.status(500).send('error');
    }
  }
}

export default WebhookController;
