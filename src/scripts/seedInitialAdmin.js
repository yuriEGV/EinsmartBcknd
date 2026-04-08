import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import Tenant from '../models/tenantModel.js';

export async function seedInitialAdmin() {
    try {
        console.log('--------------------------------------------------');
        console.log('🚀 [SEED] Iniciando seeding de administrador...');
        
        // 1. Obtener datos del colegio desde el entorno
        const schoolName = process.env.SCHOOL_NAME || 'Einsmart Default';
        const schoolDomain = process.env.SCHOOL_DOMAIN || 'einsmart.cl';
        
        console.log(`📡 [SEED] Configuración: "${schoolName}" (${schoolDomain})`);
        
        // 2. Asegurar que existe el Tenant
        let tenant = await Tenant.findOne({ name: schoolName });
        if (!tenant) {
            tenant = await Tenant.findOne({ domain: schoolDomain });
        }
        
        if (!tenant) {
            tenant = await Tenant.create({
                name: schoolName,
                domain: schoolDomain,
                theme: { primaryColor: '#3b82f6', secondaryColor: '#1e293b' },
                plan: 'basic'
            });
            console.log(`✅ [SEED] Tenant creado: ${schoolName} (ID: ${tenant._id})`);
        } else {
            // Actualizar nombre si cambió en el .env
            tenant.name = schoolName;
            tenant.domain = schoolDomain;
            await tenant.save();
            console.log(`ℹ️ [SEED] Tenant existente actualizado: ${tenant.name} (ID: ${tenant._id})`);
        }

        // 3. Crear/Actualizar administradores
        const admins = [
            { name: 'Yuri Admin', email: 'yuri@einsmart.cl', rut: '11.222.333-4' },
            { name: 'Soporte Einsmart', email: 'soporte@einsmart.cl', rut: '99.999.999-9' }
        ];

        const passwordHash = await bcrypt.hash('123456', 10);

        for (const admin of admins) {
            let user = await User.findOne({ email: admin.email });
            if (user) {
                user.name = admin.name;
                user.passwordHash = passwordHash;
                user.role = 'admin';
                user.tenantId = tenant._id;
                user.rut = admin.rut;
                await user.save();
                console.log(`✅ [SEED] Usuario actualizado: ${admin.email} (Role: ${user.role}, Tenant: ${tenant.name})`);
            } else {
                await User.create({
                    name: admin.name,
                    email: admin.email,
                    passwordHash,
                    role: 'admin',
                    tenantId: tenant._id,
                    rut: admin.rut
                });
                console.log(`✅ [SEED] Usuario creado: ${admin.email} (Role: admin, Tenant: ${tenant.name})`);
            }
        }

        console.log('🏁 [SEED] Seeding completado con éxito.');
        console.log('--------------------------------------------------');
        return true;
    } catch (error) {
        console.error('❌ [SEED] Error en seedInitialAdmin:', error);
        return false;
    }
}

if (process.argv[1] && process.argv[1].endsWith('seedInitialAdmin.js')) {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/einsmart';
    mongoose.connect(MONGO_URI)
        .then(() => seedInitialAdmin())
        .then(() => mongoose.connection.close())
        .catch(err => {
            console.error('Error de conexión en seed script:', err);
            process.exit(1);
        });
}
