// src/scripts/seedInitialAdmin.js — PostgreSQL version
import bcrypt from 'bcryptjs';
import { Tenant, User } from '../models/pgModels.js';

export async function seedInitialAdmin() {
    try {
        // Verificar si ya hay datos
        const tenantCount = await Tenant.count({});
        if (tenantCount > 0) {
            console.log('✅ Base de datos ya inicializada. Seed omitido.');
            return;
        }

        console.log('🌱 Iniciando seed inicial...');

        // Crear tenant principal (Instituto Marítimo)
        const tenant = await Tenant.create({
            name: 'Instituto Marítimo',
            domain: 'imaritimo.cl',
            academic_year: '2026',
            payment_type: 'paid',
            theme: JSON.stringify({ primaryColor: '#0f4c81', secondaryColor: '#1e293b' })
        });
        console.log(`✅ Tenant creado: ${tenant.name} (${tenant.id})`);

        // Crear admin
        const password_hash = await bcrypt.hash('Admin2024!', 10);
        const admin = await User.create({
            tenant_id: tenant.id,
            name: 'Yuri Admin',
            email: 'yuri@einsmart.cl',
            rut: '11.222.333-4',
            password_hash,
            role: 'admin',
            must_change_password: false,
            must_change_pin: false
        });
        console.log(`✅ Admin creado: ${admin.email}`);
        console.log('🎉 Seed inicial completado.');
    } catch (err) {
        if (err.code === '23505') {
            console.log('✅ Seed ya ejecutado anteriormente.');
        } else {
            console.error('❌ Error en seed inicial:', err.message);
        }
    }
}
