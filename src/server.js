import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from './config/db.js';
import { User, Tenant } from './models/pgModels.js';
import apiRoutes from './routes/index.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { seedInitialAdmin } from './scripts/seedInitialAdmin.js';

const app = express();

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
    } catch { return false; }
}

const allowedOrigins = [
    'http://localhost:5173','http://localhost:3000','http://localhost',
    'https://maritimo4-0-frontend.vercel.app','https://einsmartfrntnd.vercel.app',
    'https://einsmartfrntnd-ruby.vercel.app','https://einsmart-bcknd.vercel.app'
];

app.use(cors({
    origin: (origin, cb) => {
        const ok = !origin || allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') || isLocalNetworkOrigin(origin);
        cb(null, ok);
    },
    methods: ['GET','POST','OPTIONS','PUT','PATCH','DELETE'],
    allowedHeaders: ['Content-Type','Authorization','x-tenant-id','X-Requested-With','Accept','X-CSRF-Token'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

const cwd = process.cwd();
app.use('/uploads', express.static(path.join(cwd, 'uploads')));

// Health check
app.get('/health', async (req, res) => {
    try {
        const userCount = await User.count({});
        const tenantCount = await Tenant.count({});
        res.status(200).json({
            status: 'OK', db: 'postgres',
            users: userCount, tenants: tenantCount,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', error: err.message });
    }
});

app.get('/', (req, res) => res.json({
    message: 'Einsmart API is running 🚀',
    version: '6.0.0',
    db: 'PostgreSQL',
    timestamp: new Date().toISOString()
}));

app.use(['/api', '/'], apiRoutes);

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
    console.log('✅ PostgreSQL conectado. Ejecutando seed...');
    await seedInitialAdmin();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Einsmart Backend listo en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Error al iniciar servidor:', err);
    process.exit(1);
});

export default app;
