import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import Tenant from '../models/tenantModel.js';
import 'dotenv/config';

async function force() {
    try {
        console.log('🔨 Forzando creación de súper administrador...');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI no definido');

        await mongoose.connect(mongoUri);
        
        let tenant = await Tenant.findOne();
        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Einsmart Colegio',
                domain: 'einsmart.cl',
                plan: 'basic'
            });
            console.log('✅ Tenant creado por defecto');
        }

        const email = 'yuri@einsmart.cl';
        const passwordHash = await bcrypt.hash('123456', 10);

        await User.deleteMany({ email: email.toLowerCase() });
        
        const user = await User.create({
            name: 'Yuri Administrador',
            email: email.toLowerCase(),
            passwordHash: passwordHash,
            role: 'admin',
            tenantId: tenant._id,
            rut: '11.222.333-4'
        });

        console.log(`✅ Súper Admin creado con éxito: ${email}`);
        console.log(`🔑 Password: 123456`);
        console.log(`🏢 Vinculado a: ${tenant.name}`);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

force();
