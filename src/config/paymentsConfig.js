const paymentsConfig = {
  ML_WEBHOOK_TOKEN: process.env.ML_WEBHOOK_TOKEN || null,
  ML_ACCESS_TOKEN: process.env.ML_ACCESS_TOKEN || null,
  FLOW_API_KEY: process.env.FLOW_API_KEY || null,
  FLOW_MERCHANT_ID: process.env.FLOW_MERCHANT_ID || null,
  FLOW_WEBHOOK_SECRET: process.env.FLOW_WEBHOOK_SECRET || null,
  PAYMENTS_CALLBACK_URL: process.env.PAYMENTS_CALLBACK_URL || null,
};

export default paymentsConfig;
