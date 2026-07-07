// src/scripts/seedInitialAdmin.js — PostgreSQL version
import bcrypt from 'bcryptjs';
import { Tenant, User } from '../models/pgModels.js';

export async function seedInitialAdmin() {
    try {
        console.log('🌱 Iniciando verificación/seed inicial...');

        let tenant = await Tenant.findOne({ where: { name: 'Instituto Marítimo' } });
        if (!tenant) {
            tenant = await Tenant.findOne({ where: { domain: 'imaritimo.cl' } });
        }

        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Instituto Marítimo',
                domain: 'imaritimo.cl',
                academic_year: '2026',
                payment_type: 'paid',
                theme: JSON.stringify({ primaryColor: '#0f4c81', secondaryColor: '#1e293b' })
            });
            console.log(`✅ Tenant creado: ${tenant.name} (${tenant.id})`);
        } else {
            console.log(`ℹ️ Tenant existente: ${tenant.name} (${tenant.id})`);
        }

        const password_hash = await bcrypt.hash('123456', 10);
        let admin = await User.findOne({ where: { email: 'yuri@einsmart.cl' } });

        if (admin) {
            // Actualizar contraseña y rol
            admin.password_hash = password_hash;
            admin.role = 'admin';
            admin.tenant_id = tenant.id;
            await admin.save();
            console.log(`✅ Admin actualizado: ${admin.email}`);
        } else {
            // Crear si no existe
            admin = await User.create({
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
        }

        console.log('🎉 Seed de administración verificado y completado.');
    } catch (err) {
        console.error('❌ Error en seed inicial:', err.message);
    }
}
