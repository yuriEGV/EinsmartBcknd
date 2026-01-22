import 'dotenv/config';
import connectDB from '../config/db.js';
import Tenant from '../models/tenantModel.js';
import Estudiante from '../models/estudianteModel.js';
import Tariff from '../models/tariffModel.js';
import Payment from '../models/paymentModel.js';

async function run() {
  try {
    await connectDB();

    console.log('Conectado a MongoDB — creando datos de prueba...');

    // 1) Crear tenant
    const tenant = await Tenant.create({ name: 'Tenant Prueba' });

    // 2) Crear estudiante
    const estudiante = await Estudiante.create({
      nombre: 'Juan',
      apellido: 'Pérez',
      edad: 12,
      grado: '6to'
    });

    // 3) Crear tarifa (matrícula)
    const tariff = await Tariff.create({
      tenantId: tenant._id,
      name: 'Matrícula 2026',
      description: 'Pago de matrícula para año 2026',
      amount: 350.00,
      currency: 'PEN',
      active: true
    });

    // 4) Crear payment en estado pending con referencia externa
    const externalRef = `TEST-EXT-${Date.now()}`;

    const payment = await Payment.create({
      tenantId: tenant._id,
      estudianteId: estudiante._id,
      tariffId: tariff._id,
      amount: tariff.amount,
      currency: tariff.currency,
      status: 'pending',
      provider: null,
      providerPaymentId: null,
      metadata: {
        external_reference: externalRef,
        description: 'Pago matrícula - ambiente de pruebas'
      }
    });

    console.log('--- DATOS CREADOS ---');
    console.log('Tenant ID:', tenant._id.toString());
    console.log('Estudiante ID:', estudiante._id.toString());
    console.log('Tariff ID:', tariff._id.toString());
    console.log('Payment ID:', payment._id.toString());
    console.log('Payment external_reference:', externalRef);

    console.log('\n--- EJEMPLOS de Webhook (cURL) para simular actualización a `paid` ---');

    console.log('\n1) Simular webhook MercadoLibre (usa external_reference en collection.external_reference):');
    console.log(`curl -X POST http://localhost:5000/api/payments/webhooks/mercadolibre -H "Content-Type: application/json" -H "x-mercadopago-notification: demo-notif" -d '{"collection":{"id":"123456","status":"approved","external_reference":"${externalRef}"}}'`);

    console.log('\n2) Simular webhook Flow (usa reference o paymentId en body):');
    console.log(`curl -X POST http://localhost:5000/api/payments/webhooks/flow -H "Content-Type: application/json" -H "x-flow-event-id: demo-event" -d '{"id":"flow-123","status":"approved","reference":"${externalRef}"}'`);

    console.log('\nNotas:');
    console.log('- Inicia tu servidor local con `node src/server.js` y asegúrate de tener `MONGO_URI` en tu .env.');
    console.log('- Los webhooks públicos están expuestos en `/api/payments/webhooks/mercadolibre` y `/api/payments/webhooks/flow`.');
    console.log('- El script crea un Payment con `metadata.external_reference` que los webhooks usan para encontrar y actualizar el Payment.');

    process.exit(0);
  } catch (err) {
    console.error('Error al crear datos de prueba:', err);
    process.exit(1);
  }
}

run();
