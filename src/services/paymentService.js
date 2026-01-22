/*import Payment from '../models/paymentModel.js';
import Tariff from '../models/tariffModel.js';
import flowService from './flowService.js';
import mercadoLibreService from './mercadoLibreService.js';
import webpayService from './webpayService.js';

const createPaymentFromTariff = async ({ tenantId, estudianteId, tariffId, provider, metadata }) => {
  const tariff = await Tariff.findById(tariffId);
  if (!tariff) throw new Error('Tariff not found');

  const payment = new Payment({
    tenantId,
    estudianteId,
    tariffId,
    amount: tariff.amount,
    currency: tariff.currency || 'USD',
    provider: provider || null,
    metadata,
  });

  await payment.save();

  // initiate provider checkout if requested
  if (provider === 'flow') {
    const checkout = await flowService.createCheckout(payment);
    if (checkout?.providerPaymentId && !payment.providerPaymentId) {
      payment.providerPaymentId = checkout.providerPaymentId;
      await payment.save();
    }
    return { payment, checkout };
  }

  if (provider === 'mercadolibre') {
    const checkout = await mercadoLibreService.createCheckout(payment);
    if (checkout?.providerPaymentId && !payment.providerPaymentId) {
      payment.providerPaymentId = checkout.providerPaymentId;
      await payment.save();
    }
    return { payment, checkout };
  }

  if (provider === 'webpay') {
    const checkout = await webpayService.createCheckout(payment);
    if (checkout?.providerPaymentId && !payment.providerPaymentId) {
      payment.providerPaymentId = checkout.providerPaymentId;
      await payment.save();
    }
    return { payment, checkout };
  }

  return { payment };
};

const getPayment = async (id, tenantId) => Payment.findOne({ _id: id, tenantId });
const listPayments = async (filter = {}) => Payment.find(filter).sort({ createdAt: -1 });

export default {
  createPaymentFromTariff,
  getPayment,
  listPayments,
};
*/
import { config } from 'dotenv';
config();

import mercadopago from 'mercadopago';
import Payment from '../models/paymentModel.js';
import Tariff from '../models/tariffModel.js';
import Estudiante from '../models/estudianteModel.js';
import flowService from './flowService.js';
import mercadoLibreService from './mercadoLibreService.js';
import webpayService from './webpayService.js';

// Config MercadoPago
// Config MercadoPago
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });
} else {
  console.warn("⚠️ MERCADOPAGO_ACCESS_TOKEN no definido en variables de entorno. Los pagos con MP fallarán.");
}

const createPaymentFromTariff = async ({ tenantId, estudianteId, tariffId, provider, metadata = {} }) => {
  // Validar tarifa
  const tarifa = await Tariff.findOne({ _id: tariffId, tenantId });
  if (!tarifa) throw new Error('Tarifa no encontrada');

  // Validar estudiante
  const estudiante = await Estudiante.findById(estudianteId);
  if (!estudiante) throw new Error('Estudiante no encontrado');

  // MercadoPago — solo si provider = "mercadopago"
  if (provider === "mercadopago") {
    const preference = {
      items: [
        {
          title: tarifa.name,
          quantity: 1,
          currency_id: tarifa.currency || 'CLP',
          unit_price: tarifa.amount,
        },
      ],
      payer: {
        name: estudiante.nombre,
        surname: estudiante.apellido,
        email: metadata?.email || "test_user@test.com"
      },
      back_urls: {
        success: process.env.MP_SUCCESS_URL,
        pending: process.env.MP_PENDING_URL,
        failure: process.env.MP_FAILURE_URL,
      },
      auto_return: "approved",
      metadata: { tenantId, estudianteId, tariffId, ...metadata },
    };

    const mpRes = await mercadopago.preferences.create(preference);

    const initPoint = mpRes.body?.init_point;
    const preferenceId = mpRes.body?.id;

    const pago = await Payment.create({
      tenantId,
      estudianteId,
      tariffId,
      amount: tarifa.amount,
      currency: tarifa.currency || "CLP",
      provider,
      providerPaymentId: preferenceId,
      status: "pending",
      metadata: { init_point: initPoint, ...metadata }
    });

    return { payment: pago, checkout: { initPoint, preferenceId } };
  }

  // Flow
  if (provider === 'flow') {
    const checkout = await flowService.createCheckout(payment);
    await Payment.updateOne({ _id: payment._id }, { providerPaymentId: checkout.providerPaymentId });
    return { payment, checkout };
  }

  // MercadoLibre
  if (provider === 'mercadolibre') {
    const checkout = await mercadoLibreService.createCheckout(payment);
    await Payment.updateOne({ _id: payment._id }, { providerPaymentId: checkout.providerPaymentId });
    return { payment, checkout };
  }

  // WebPay
  if (provider === 'webpay') {
    const checkout = await webpayService.createCheckout(payment);
    await Payment.updateOne({ _id: payment._id }, { providerPaymentId: checkout.providerPaymentId });
    return { payment, checkout };
  }

  // Pago sin proveedor
  const payment = await Payment.create({
    tenantId,
    estudianteId,
    tariffId,
    amount: tarifa.amount,
    currency: tarifa.currency || 'CLP',
    provider: null,
    metadata,
  });

  return { payment };
};

const getPayment = (id, tenantId) => Payment.findOne({ _id: id, tenantId });

const listPayments = (filter = {}) =>
  Payment.find(filter).sort({ createdAt: -1 });

export default {
  createPaymentFromTariff,
  getPayment,
  listPayments,
};
