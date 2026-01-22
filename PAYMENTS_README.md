Payments integration
====================

Overview
--------
This folder adds a simple payments system with:

- Models: `Tariff`, `Payment`, `Transaction`
- Services: `paymentService`, `flowService`, `mercadoLibreService` (stubs)
- Controllers and routes for CRUD and webhooks

Environment
-----------
Fill `.env` using `.env.example` and set at least:

- `ML_WEBHOOK_TOKEN` — token to verify Mercado Libre webhooks (if used)
- `ML_ACCESS_TOKEN` — MercadoPago API token (optional)
- `FLOW_API_KEY`, `FLOW_MERCHANT_ID` — Flow credentials (optional)
- `PAYMENTS_CALLBACK_URL` — your public callback URL for checkout redirects
 - `FLOW_WEBHOOK_SECRET` — secret used to verify Flow webhook signatures (HMAC SHA256)

Dependencies
------------
The services use `axios` to call external APIs. Install it:

```bash
npm install axios
```

Next steps
----------
- Implement real API calls in `src/services/flowService.js` and `src/services/mercadoLibreService.js`.
- `src/services/mercadoLibreService.js` now implements MercadoPago preference creation (requires `ML_ACCESS_TOKEN`).
- `src/services/flowService.js` implements HMAC verification using `FLOW_WEBHOOK_SECRET` and expects `req.rawBody` to be available.
- Wire provider-specific IDs returned by providers into the `Payment.providerPaymentId` field.
- Expand webhooks parsing in `src/controllers/webhookController.js` to map events to payments and update `Payment.status`.
