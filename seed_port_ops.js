
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

        const carlos = await User.findOne({ tenantId: tenant._id, name: /carlos flores/i });
        if (!carlos) throw new Error('❌ Teacher Carlos Flores must exist.');
        console.log(`✅ Teacher: ${carlos.name} (${carlos._id})`);

        let career = await Career.findOne({ tenantId: tenant._id, name: /operaciones portuarias/i });
        const duplicateCareer = await Career.findOne({ tenantId: tenant._id, name: "Operación Portuaria" });

        if (duplicateCareer) {
            console.log(`🧹 Deleting duplicate career: ${duplicateCareer.name} (${duplicateCareer._id})`);
            await Career.deleteOne({ _id: duplicateCareer._id });
        }

        if (!career) {
            career = await Career.create({
                tenantId: tenant._id,
                name: 'Operaciones Portuarias',
                description: 'Especialidad técnica profesional en operaciones portuarias',
                type: 'tecnico-profesional',
                code: 'OP-PORT',
                headTeacher: carlos._id,
                profesorJefe: carlos._id
            });
            console.log('✅ Career created with Carlos as Jefe de Carrera');
        } else {
            console.log(`✅ Career found: ${career.name} (${career._id})`);
            // Ensure roles are assigned if they were missing
            career.headTeacher = carlos._id;
            career.profesorJefe = carlos._id;
            await career.save();
            console.log('✅ Career roles updated for Carlos Flores');
        }

        // 3. Load Student Data
        const dataPath = path.join(__dirname, 'students_data.json');
        if (!fs.existsSync(dataPath)) throw new Error('❌ students_data.json not found');
        const studentsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const passwordHash = await bcrypt.hash('123456', 10);

        // CLEANUP PREVIOUS PARTIAL DATA
        const courseNames = Object.keys(studentsData); // 3E, 4E, 3I, 4I
        await Course.deleteMany({ tenantId: tenant._id, name: { $in: courseNames } });
        console.log('🧹 Cleaned existing courses (3E, 4E, 3I, 4I) for re-seeding');

        // Remove "I°B" if it was assigned to Carlos (seen in dashboard screenshot)
        await Course.deleteOne({ tenantId: tenant._id, name: "I°B", teacherId: carlos._id });
        console.log('🧹 Removed incorrect I°B course assignment');

        for (const [courseName, list] of Object.entries(studentsData)) {
            console.log(`\n--- Processing Course: ${courseName} (${list.length} students) ---`);

            // A. Course
            const level = courseName.startsWith('3') ? '3° Medio' : '4° Medio';
            const letter = courseName.endsWith('E') ? 'E' : 'I';
            const course = await Course.create({
                tenantId: tenant._id,
                name: courseName,
                level,
                letter,
                teacherId: carlos._id,
                careerId: career._id,
                description: `Curso ${courseName} - Operaciones Portuarias`
            });
            console.log(`✅ Created course ${courseName}`);

            // B. Students
            for (const s of list) {
                const names = s.name.split(', ');
                const lastNames = names[0];
                const firstNames = names[1];

                // Search by name first
                let student = await Estudiante.findOne({ tenantId: tenant._id, nombres: firstNames, apellidos: lastNames });

                // If not found, search by email to avoid duplicate email errors
                if (!student) {
                    const tempEmail = `${s.id}@imaritimo.cl`;
                    student = await Estudiante.findOne({ tenantId: tenant._id, email: tempEmail });
                }

                if (!student) {
                    const fakeRut = `${Math.floor(Math.random() * 20) + 10}.${s.id.padStart(6, '0').slice(0, 3)}.${s.id.slice(3)}-${Math.floor(Math.random() * 9)}`;

                    try {
                        student = await Estudiante.create({
                            tenantId: tenant._id,
                            nombres: firstNames,
                            apellidos: lastNames,
                            rut: fakeRut,
                            email: `${s.id}@imaritimo.cl`,
                            matricula: s.id
                        });

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
                    } catch (createErr) {
                        console.error(`  ❌ Failed to create student ${s.name}:`, createErr.message);
                        if (createErr.errors) {
                            Object.keys(createErr.errors).forEach(key => {
                                console.error(`     Field ${key}: ${createErr.errors[key].message}`);
                            });
                        }
                        continue; // Skip this student
                    }
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
                        period: '2025',
                        status: 'confirmada'
                    });
                    console.log(`    > Enrolled in ${courseName}`);
                }
            }
        }

        console.log('\n🚀 SEEDING & CLEANUP COMPLETE!');

    } catch (err) {
        console.error('❌ SEEDING FAILED:');
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

seed();
