import axios from 'axios';
import paymentsConfig from '../config/paymentsConfig.js';

const MP_API = 'https://api.mercadopago.com';

const createCheckout = async (payment) => {
  const accessToken = paymentsConfig.ML_ACCESS_TOKEN;
  const externalReference = payment._id.toString();

  if (!accessToken) {
    return {
      provider: 'mercadolibre',
      checkoutUrl: paymentsConfig.PAYMENTS_CALLBACK_URL || null,
      providerPaymentId: `ml_${payment._id}`,
      warning: 'ML_ACCESS_TOKEN not configured',
    };
  }

  // Build preference
  const preference = {
    items: [
      {
        id: payment._id.toString(),
        title: payment.metadata?.title || `Pago ${payment._id}`,
        description: payment.metadata?.description || 'Pago escolar',
        quantity: 1,
        unit_price: payment.amount,
        currency_id: payment.currency || 'USD',
      }
    ],
    external_reference: externalReference,
    back_urls: {
      success: paymentsConfig.PAYMENTS_CALLBACK_URL,
      failure: paymentsConfig.PAYMENTS_CALLBACK_URL,
      pending: paymentsConfig.PAYMENTS_CALLBACK_URL,
    },
    auto_return: 'approved'
  };

  const resp = await axios.post(`${MP_API}/checkout/preferences`, preference, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = resp.data;

  return {
    provider: 'mercadolibre',
    checkoutUrl: data.init_point || data.sandbox_init_point,
    providerPaymentId: data.id ? String(data.id) : `ml_${payment._id}`,
    raw: data,
  };
};

const verifyWebhook = async (headers, body, rawBody) => {
  // Prefer token header match (if configured)
  if (paymentsConfig.ML_WEBHOOK_TOKEN) {
    const token = headers['x-ml-webhook-token'] || headers['x-mercadopago-notification'];
    if (token && token === paymentsConfig.ML_WEBHOOK_TOKEN) return true;
  }

  // If we have an access token and the notification contains a payment id, fetch it to ensure authenticity
  const accessToken = paymentsConfig.ML_ACCESS_TOKEN;
  const paymentId = body?.data?.id || body?.collection?.id || body?.id;
  if (accessToken && paymentId) {
    try {
      const resp = await axios.get(`${MP_API}/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return !!resp.data;
    } catch (err) {
      return false;
    }
  }

  // Last resort: accept (not ideal)
  return true;
};

export default { createCheckout, verifyWebhook };
