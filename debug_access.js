
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';
import Tenant from './src/models/tenantModel.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

const listCredentials = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const tenants = await Tenant.find();
        console.log('\n=== INSTITUCIONES (TENANTS) ===');
        tenants.forEach(t => console.log(`- ${t.name} (ID: ${t._id})`));

        const users = await User.find().populate('tenantId');
        console.log('\n=== USUARIOS Y CREDENCIALES ===');
        users.forEach(u => {
            const tenantName = u.tenantId?.name || 'Sin Institución';
            console.log(`User: ${u.email} | Role: ${u.role} | Tenant: ${tenantName}`);
            // Note: Cannot show password hash, but knowing the email helps.
            // If user needs reset, we can do it here.
        });

        console.log('\n=== INSTRUCCIONES ===');
        console.log('Para resetear contraseña de alguien, usa el endpoint /setup-admin o edita este script.');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

listCredentials();
