import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { fileURLToPath } from 'url';

// Import routes and middleware
// import apiRoutes from './routes/index.js';
import reportRoutes from './routes/reportRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';
import payrollRoutes from './routes/payrollRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminDayRoutes from './routes/adminDayRoutes.js';
import userNotificationRoutes from './routes/userNotificationRoutes.js';

// Import models for setup route
import User from './models/userModel.js';
import Tenant from './models/tenantModel.js';
import bcrypt from 'bcryptjs';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://maritimo4-0-frontend.vercel.app',
  'https://einsmartfrntnd.vercel.app',
  'https://einsmartfrntnd-ruby.vercel.app',
  'https://einsmart-bcknd.vercel.app'
];

// Robust CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost');

    if (isAllowed) {
      callback(null, true);
    } else {
      // Use null instead of Error to prevent uncaught exception crashes in some environments
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf && buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Single Health check & Root
app.get('/health', (req, res) => res.status(200).json({ status: 'OK - Minimal Server' }));
app.get('/', (req, res) => res.json({
  message: 'Einsmart API is running in DEBUG mode 🚀',
  version: '5.2.1',
  timestamp: new Date().toISOString()
}));

// --- TEMPORARY SETUP ROUTE ---
app.get('/setup-admin', async (req, res) => {
  try {
    await connectDB();
    let tenant = await Tenant.findOne({ name: 'Einsmart' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Einsmart',
        domain: 'einsmart.cl',
        theme: { primaryColor: '#3b82f6', secondaryColor: '#1e293b' }
      });
    }

    const admins = [
      { name: 'Yuri Admin', email: 'yuri@gmail.com', rut: '12.345.678-K' },
      { name: 'Yuri Admin Einsmart', email: 'yuri@einsmart.cl', rut: '11.222.333-4' },
      { name: 'Vicente Admin', email: 'vicente@einsmart.cl', rut: '22.333.444-5' }
    ];

    const results = [];
    for (const admin of admins) {
      const passwordHash = await bcrypt.hash('123456', 10);
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
    return res.status(500).json({ message: 'Setup Error', error: error.message });
  }
});

// Register routes
// app.use(['/api', '/'], apiRoutes);

// Backup for specific legacy routes if needed (though index.js covers them)
// app.use('/api/payroll', payrollRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/admin-days', adminDayRoutes);
// app.use('/api/user-notifications', userNotificationRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
  });
}

export default app;
