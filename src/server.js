import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { fileURLToPath } from 'url';

const app = express();

// ========================================
// CORS ABSOLUTAMENTE PRIMERO
// ========================================
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://maritimo4-0-frontend.vercel.app',  // Frontend production
    /^https:\/\/maritimo4-0-frontend-.*\.vercel\.app$/  // Frontend previews
  ];

  const origin = req.headers.origin;

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, X-Requested-With, Accept, X-CSRF-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
// Now safe to import routes (after JWT check is non-fatal)
import apiRoutes from './routes/index.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import reportRoutes from './routes/reportRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';




// Middleware
// Capture raw body for webhook signature verification
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf && buf.toString(); } }));
app.use(morgan('dev'));

// Rutas protegidas específicas PRIMERO
app.use('/api/reports', authMiddleware, reportRoutes);

// Rutas generales DESPUÉS
app.use('/api', apiRoutes);

// Endpoint raíz
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente 🚀' });
});

// Middleware de errores SIEMPRE AL FINAL
app.use(errorMiddleware);

// --- TEMPORARY SETUP ROUTE ---
import User from './models/userModel.js';
import Tenant from './models/tenantModel.js';
import bcrypt from 'bcryptjs';

app.get('/setup-admin', async (req, res) => {
  try {
    await connectDB(); // Ensure DB is connected for Vercel

    let tenant = await Tenant.findOne({ name: 'Einsmart' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Einsmart',
        domain: 'einsmart.cl',
        theme: { primaryColor: '#3b82f6', secondaryColor: '#1e293b' }
      });
    }

    const admins = [
      { name: 'Yuri Admin', email: 'yuri@einsmart.cl', rut: '1-9' },
      { name: 'Vicente Admin', email: 'vicente@einsmart.cl', rut: '2-7' }
    ];

    const results = [];
    for (const admin of admins) {
      const password = '123456';
      const passwordHash = await bcrypt.hash(password, 10);
      let user = await User.findOne({ email: admin.email });

      if (user) {
        user.passwordHash = passwordHash;
        user.role = 'admin';
        user.tenantId = tenant._id;
        await user.save();
        results.push(`${admin.email} updated`);
      } else {
        await User.create({
          name: admin.name,
          email: admin.email,
          passwordHash,
          role: 'admin',
          tenantId: tenant._id,
          rut: admin.rut
        });
        results.push(`${admin.email} created`);
      }
    }
    return res.json({ message: 'Setup complete', details: results });
  } catch (error) {
    console.error("Setup Error:", error);
    return res.status(500).json({ error: error.message || 'Error occurred' });
  }
});
// -----------------------------


// Iniciar servidor solo en local
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      console.log(`✅ MongoDB conectado a: ${mongoose.connection.host} `);

      app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('❌ Error conectando a MongoDB:', err.message);
    });
}

export default app;
