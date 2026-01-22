import axios from 'axios';
import crypto from 'crypto';
import paymentsConfig from '../config/paymentsConfig.js';

const createCheckout = async (payment) => {
  // Placeholder: implement Flow integration according to Flow API
  // Use paymentsConfig.FLOW_API_KEY and other env vars
  return {
    provider: 'flow',
    checkoutUrl: paymentsConfig.PAYMENTS_CALLBACK_URL || null,
    providerPaymentId: `flow_${payment._id}`,
  };
};

const verifyWebhook = async (headers, body, rawBody) => {
  // Verify using HMAC SHA256 header 'x-flow-signature' if FLOW_WEBHOOK_SECRET is configured
  const secret = paymentsConfig.FLOW_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured → cannot verify

  const signatureHeader = headers['x-flow-signature'] || headers['x-hook-signature'] || headers['x-flow-signature-sha256'];
  if (!signatureHeader) return false;

  // rawBody is expected to be the raw request body string
  const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(body || {});

  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Some providers send base64 or hex; compare tolerant
  if (computed === signatureHeader) return true;

  // Accept if signatureHeader is base64 of computed hex
  const computedBase64 = Buffer.from(computed, 'hex').toString('base64');
  if (computedBase64 === signatureHeader) return true;

  return false;
};

export default { createCheckout, verifyWebhook };
