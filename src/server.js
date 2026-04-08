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
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Import models for setup route
import User from './models/userModel.js';
import Tenant from './models/tenantModel.js';
import bcrypt from 'bcryptjs';
import { seedInitialAdmin } from './scripts/seedInitialAdmin.js';


const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
  'https://maritimo4-0-frontend.vercel.app',
  'https://einsmartfrntnd.vercel.app',
  'https://einsmartfrntnd-ruby.vercel.app',
  'https://einsmart-bcknd.vercel.app'
];

// Detecta si el origen es una IP privada de LAN (despliegue local en colegio)
function isLocalNetworkOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      /^127\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

// Robust CORS configuration (LAN + cloud)
app.use(cors({
  origin: (origin, callback) => {
    // Sin origen = petición interna (nginx proxy, curl, mobile app) → permitir
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      isLocalNetworkOrigin(origin);

    callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf && buf.toString(); } }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Single Health check & Root
app.get('/health', async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({ status: 'OK', db: mongoose.connection.readyState });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

app.get('/', (req, res) => res.json({
  message: 'Einsmart API is running 🚀',
  version: '5.2.4',
  timestamp: new Date().toISOString()
}));

// El setup inicial ahora se maneja automáticamente al arrancar el servidor vía seedInitialAdmin.js


// Register routes
app.use(['/api', '/'], apiRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

const __filename = fileURLToPath(import.meta.url);
const PORT = process.env.PORT || 5000;
console.log(`Starting server on port ${PORT}...`);

connectDB().then(async () => {
  console.log('✅ Database connected. Running seeding...');
  // Run initial seeding
  await seedInitialAdmin();
  
  app.listen(PORT, () => {
    console.log(`🚀 Einsmart Backend ready at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});


export default app;
