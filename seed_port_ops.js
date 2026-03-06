
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Models
import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Career from './src/models/careerModel.js';
import Course from './src/models/courseModel.js';
import Estudiante from './src/models/estudianteModel.js';
import Enrollment from './src/models/enrollmentModel.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('❌ Falta MONGO_URI');

        await mongoose.connect(uri);
        console.log('✅ Connected to DB');

        const tenant = await Tenant.findOne({ name: /instituto/i, name: /maritimo/i });
        if (!tenant) throw new Error('❌ Tenant Maritimo not found');
        console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

        // 1. Career
        let career = await Career.findOne({ tenantId: tenant._id, name: /operación portuaria/i });
        if (!career) {
            career = await Career.create({
                tenantId: tenant._id,
                name: 'Operación Portuaria',
                description: 'Especialidad técnica profesional en operaciones portuarias',
                type: 'tecnico-profesional',
                code: 'OP-PORT'
            });
            console.log('✅ Career created');
        } else {
            console.log('✅ Career found');
        }

        // 2. Teachers
        const carlos = await User.findOne({ tenantId: tenant._id, name: /carlos flores/i });
        const erwin = await User.findOne({ tenantId: tenant._id, name: /erwin cubillos/i });

        if (!carlos || !erwin) {
            console.warn('⚠️ One or both teachers not found. Using current user if needed or failing.');
            // For now, let's create them if they don't exist to make the script robust, 
            // but the user said they exist.
        }

        const teachers = {
            '3E': carlos?._id,
            '3I': carlos?._id,
            '4E': carlos?._id,
            '4I': carlos?._id
        };

        // Carlos Flores must exist
        if (!carlos) throw new Error('❌ Teacher Carlos Flores must exist.');

        // 3. Load Student Data
        const dataPath = path.join(__dirname, 'students_data.json');
        const studentsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const passwordHash = await bcrypt.hash('123456', 10);

        for (const [courseName, list] of Object.entries(studentsData)) {
            console.log(`\n--- Processing Course: ${courseName} ---`);

            // A. Course
            let course = await Course.findOne({ tenantId: tenant._id, name: courseName });
            if (!course) {
                const level = courseName.startsWith('3') ? '3° Medio' : '4° Medio';
                const letter = courseName.endsWith('E') ? 'E' : 'I';
                course = await Course.create({
                    tenantId: tenant._id,
                    name: courseName,
                    level,
                    letter,
                    teacherId: teachers[courseName],
                    careerId: career._id,
                    description: `Curso ${courseName} - Operación Portuaria`
                });
                console.log(`✅ Created course ${courseName}`);
            } else {
                // Update course to link with correct teacher and career if needed
                course.teacherId = teachers[courseName];
                course.careerId = career._id;
                await course.save();
                console.log(`✅ Updated existing course ${courseName}`);
            }

            // B. Students
            for (const s of list) {
                // Check if student exists by ID (recorded as matricula or internal code)
                // In this context, let's use the name since we don't have RUTs.
                // But Wait, I should generate a RUT for them if they don't have one to avoid validation errors.
                const names = s.name.split(', ');
                const lastNames = names[0];
                const firstNames = names[1];

                let student = await Estudiante.findOne({ tenantId: tenant._id, nombres: firstNames, apellidos: lastNames });

                if (!student) {
                    // Generate a fake RUT if we don't have one, or use the ID as part of it
                    const fakeRut = `${Math.floor(Math.random() * 20) + 10}.${s.id.padStart(6, '0').slice(0, 3)}.${s.id.slice(3)}-${Math.floor(Math.random() * 9)}`;

                    student = await Estudiante.create({
                        tenantId: tenant._id,
                        nombres: firstNames,
                        apellidos: lastNames,
                        rut: fakeRut,
                        email: `${s.id}@imaritimo.cl`,
                        matricula: s.id
                    });

                    // Create User for login
                    await User.create({
                        tenantId: tenant._id,
                        name: `${firstNames} ${lastNames}`,
                        email: student.email,
                        passwordHash,
                        role: 'student',
                        profileId: student._id,
                        rut: student.rut
                    });
                    console.log(`  + Created student: ${s.name}`);
                } else {
                    console.log(`  . Student exists: ${s.name}`);
                }

                // C. Enrollment
                let enrollment = await Enrollment.findOne({ tenantId: tenant._id, estudianteId: student._id, courseId: course._id });
                if (!enrollment) {
                    await Enrollment.create({
                        tenantId: tenant._id,
                        estudianteId: student._id,
                        courseId: course._id,
                        period: '2025', // Assuming current year for enrollment
                        status: 'confirmada'
                    });
                    console.log(`    > Enrolled in ${courseName}`);
                }
            }
        }

        console.log('\n🚀 SEEDING COMPLETE!');

    } catch (err) {
        console.error('❌ SEEDING FAILED:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

seed();
