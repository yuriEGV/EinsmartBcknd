import crypto from 'crypto';

/**
 * Minimal Webpay service shim for local/testing.
 * - `createCheckout(payment)` returns a fake checkout URL and providerPaymentId
 * - `verifyWebhook(headers, body, rawBody)` verifies an HMAC signature
 *
 * NOTE: For production, replace with Transbank Webpay SDK and proper verification.
 */

const createCheckout = async (payment) => {
  // providerPaymentId should be unique and returned by the provider after creating a payment
  const providerPaymentId = `webpay-${crypto.randomUUID()}`;

  // fake checkout URL for testing — in production this would be the provider's checkout link
  const checkoutUrl = `https://sandbox.webpay.local/checkout/${providerPaymentId}`;

  return {
    providerPaymentId,
    checkoutUrl,
  };
};

const verifyWebhook = async (headers = {}, body = {}, rawBody = '') => {
  const secret = process.env.WEBPAY_SECRET || process.env.TRANSBANK_SHARED_SECRET || null;

  // If there is no secret configured, allow verification to succeed (helpful for local testing)
  if (!secret) {
    console.warn('WEBPAY secret not set — skipping signature verification (local/dev only)');
    return true;
  }

  // Accept either header name `x-webpay-signature` or `x-transbank-signature`
  const sigHeader = headers['x-webpay-signature'] || headers['x-transbank-signature'] || headers['x-signature'];
  if (!sigHeader) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret).update(rawBody || JSON.stringify(body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(String(sigHeader)));
  } catch (err) {
    console.error('Error verifying Webpay signature:', err);
    return false;
  }
};

export default {
  createCheckout,
  verifyWebhook,
};
