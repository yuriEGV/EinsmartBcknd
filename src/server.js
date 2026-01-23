import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import connectDB from './config/db.js';
import { fileURLToPath } from 'url';

// Import routes and middleware
import apiRoutes from './routes/index.js';
import reportRoutes from './routes/reportRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';

// Import models for setup route
import User from './models/userModel.js';
import Tenant from './models/tenantModel.js';
import bcrypt from 'bcryptjs';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://maritimo4-0-frontend.vercel.app',
  'https://einsmartfrntnd.vercel.app',
  'https://einsmart-bcknd.vercel.app',
  /\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed =>
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  optionsSuccessStatus: 200
}));

// Middleware
// Capture raw body for webhook signature verification
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf && buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));
    app.use(morgan('dev'));
    
    // --- TEMPORARY SETUP ROUTE ---
    // Esta ruta debe ir ANTES de cualquier app.use('/api', ...)
    app.get('/setup-admin', async (req, res) => {
      try {
        console.log('Attempting to connect to MongoDB for setup-admin...');
        await connectDB();
        console.log('✅ Connected to MongoDB for setup-admin.');

        let tenant = await Tenant.findOne({ name: 'Einsmart' });
        if (!tenant) {
          console.log('Creating Tenant "Einsmart"...');
          tenant = await Tenant.create({
            name: 'Einsmart',
            domain: 'einsmart.cl',
            theme: { primaryColor: '#3b82f6', secondaryColor: '#1e293b' }
          });
          console.log('✅ Tenant "Einsmart" created.');
        } else {
          console.log('✅ Tenant "Einsmart" found.');
        }

        const admins = [
          { name: 'Yuri Admin', email: 'yuri@gmail.com', rut: '12.345.678-K' },
          { name: 'Yuri Admin Einsmart', email: 'yuri@einsmart.cl', rut: '11.222.333-4' },
          { name: 'Vicente Admin', email: 'vicente@einsmart.cl', rut: '22.333.444-5' }
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

        console.log('✅ Setup admin completed successfully');
        return res.json({
          message: 'Setup complete',
          details: results,
          admin_credentials: {
            email: 'yuri@gmail.com',
            password: '123456',
            role: 'admin'
          }
        });
      } catch (error) {
        console.error("❌ Setup Error in /setup-admin:", error);
        // Aquí podemos diferenciar el error de conexión a la BD
        if (error.name === 'MongooseError' || error.name === 'MongoNetworkError') {
          return res.status(500).json({ message: 'Error de conexión a la base de datos durante el setup', error: error.message });
        } else {
          return res.status(500).json({ message: 'Error interno del servidor durante el setup', error: error.message || 'Error occurred' });
        }
      }
    });
    // -----------------------------

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    // Test endpoint
    app.get('/test', (req, res) => {
      res.json({ message: 'Backend is working', timestamp: new Date().toISOString() });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({ message: 'API funcionando correctamente 🚀', version: '5.0.0' });
    });

    // Register API routes
    app.use('/api/reports', authMiddleware, reportRoutes);
    app.use('/api', apiRoutes);

    // Middleware de errores SIEMPRE AL FINAL (with proper signature)
    app.use((err, req, res, next) => {
      console.error('Error caught by middleware:', err);
      const status = err.status || 500;
      const message = err.message || 'Error interno del servidor';
      res.status(status).json({ message });
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
