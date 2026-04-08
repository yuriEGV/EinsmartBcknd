import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Tenant from '../models/tenantModel.js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function verify() {
    try {
        console.log('🔍 Verificando estado de la base de datos...');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ Error: MONGO_URI no está definido en el entorno.');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB.');

        const email = 'yuri@einsmart.cl';
        const users = await User.find({ email: email.toLowerCase() });

        if (users.length === 0) {
            console.log(`❌ No se encontró ningún usuario con el email: ${email}`);
        } else {
            console.log(`✅ Se encontraron ${users.length} usuarios con el email: ${email}`);
            for (const user of users) {
                const tenant = await Tenant.findById(user.tenantId);
                console.log(`--- Usuario ID: ${user._id} ---`);
                console.log(`Nombre: ${user.name}`);
                console.log(`Role: ${user.role}`);
                console.log(`Tenant: ${tenant ? tenant.name : 'NO ENCONTRADO'} (${user.tenantId})`);
                
                const isMatch = await bcrypt.compare('123456', user.passwordHash);
                console.log(`¿Contraseña "123456" coincide?: ${isMatch ? 'SÍ ✅' : 'NO ❌'}`);
            }
        }

        const tenants = await Tenant.find();
        console.log(`\n📋 Lista de Colegios (Tenants) en el sistema: ${tenants.length}`);
        tenants.forEach(t => {
            console.log(`- ${t.name} (ID: ${t._id})`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        process.exit(1);
    }
}

verify();
