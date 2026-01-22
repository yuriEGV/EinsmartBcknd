import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import Estudiante from '../models/estudianteModel.js';
import Apoderado from '../models/apoderadoModel.js';
import Tenant from '../models/tenantModel.js';

dotenv.config();

async function seed() {
    try {
        console.log('🚀 Seeding test data...');
        await mongoose.connect(process.env.MONGO_URI);

        // 0. Ensure we have a Tenant
        let tenant = await Tenant.findOne({ name: 'Colegio Antártica Chilena' });
        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Colegio Antártica Chilena',
                domain: 'antartica.cl',
                plan: 'basic'
            });
            console.log('✅ Tenant created');
        }
        const tenantId = tenant._id;

        const pwd = await bcrypt.hash('123456', 10);

        // 1. Create Student record first
        const studentRut = '25.678.901-2';
        let student = await Estudiante.findOne({ rut: studentRut });
        if (!student) {
            student = await Estudiante.create({
                nombres: 'Gabriele',
                apellidos: 'Stechlin',
                email: 'gabriele@test.com',
                rut: studentRut,
                matricula: `MAT-${studentRut.split('.')[0]}-${new Date().getFullYear()}`,
                grado: '1A',
                tenantId
            });
            console.log('✅ Student created:', student.nombres);
        }

        // 2. Create Guardian record
        let guardian = await Apoderado.findOne({ estudianteId: student._id });
        if (!guardian) {
            guardian = await Apoderado.create({
                nombre: 'Juan',
                apellidos: 'Stechlin',
                correo: 'yuri@einsmart.cl',
                estudianteId: student._id,
                tipo: 'principal',
                parentesco: 'Padre',
                tenantId
            });
            console.log('✅ Guardian record created');
        }

        // 3. Create Users (Login profiles)
        const profiles = [
            { name: 'Admin Fiscalizador', email: 'admin@test.com', role: 'admin' },
            { name: 'Profesor de Prueba', email: 'profe1@test.com', role: 'teacher' },
            { name: 'Yuri Apoderado', email: 'yuri@einsmart.cl', role: 'apoderado', profileId: guardian._id },
            { name: 'Gabriele Alumno', email: 'gabriele@test.com', role: 'student', profileId: student._id }
        ];

        for (const p of profiles) {
            const existingUser = await User.findOne({ email: p.email });
            if (existingUser) {
                existingUser.name = p.name;
                existingUser.passwordHash = pwd;
                existingUser.role = p.role;
                existingUser.profileId = p.profileId;
                existingUser.tenantId = tenantId;
                await existingUser.save();
                console.log(`✅ User updated: ${p.email}`);
            } else {
                await User.create({
                    ...p,
                    passwordHash: pwd,
                    tenantId
                });
                console.log(`✅ User created: ${p.email}`);
            }
        }

        console.log('\n--- TEST PROFILES READY ---');
        console.log('1. ADMIN (Fiscalizador): admin@test.com / 123456');
        console.log('2. PROFESOR: profe1@test.com / 123456');
        console.log('3. APODERADO: yuri@einsmart.cl / 123456');
        console.log('4. ALUMNO: gabriele@test.com / 123456');

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

seed();

