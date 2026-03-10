
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Course from './src/models/courseModel.js';
import Subject from './src/models/subjectModel.js';

// The correct list of subjects requested by the user
const CORRECT_SUBJECTS = [
    { name: "Lengua y Literatura", description: "Enfoque en comunicación oral y escrita." },
    { name: "Inglés", description: "Herramientas de comunicación en idioma extranjero." },
    { name: "Filosofía", description: "Reflexión crítica y ética." },
    { name: "Matemática", description: "Desarrollo del pensamiento lógico y resolución de problemas." },
    { name: "Educación Física", description: "Promoción de vida sana y actividad física." },
    { name: "Química", description: "Estudio de la materia, sus propiedades y reacciones." },
    { name: "Física", description: "Estudio de las leyes que rigen el universo." },
    { name: "Biología", description: "Estudio de los seres vivos y sus procesos." },
    { name: "Educación Ciudadana", description: "Formación en derechos, deberes y participación social." },
];

// Old names to clean up (replace with the correct ones above)
const OLD_NAMES_TO_REMOVE = [
    "Ciencias para la Ciudadanía",
    "Educación Física y Salud",
];

async function harmonizeSubjects() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('❌ Falta MONGO_URI en el .env');
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // 1. Find Maritimo Tenant
        const tenant = await Tenant.findOne({ name: /maritimo/i });
        if (!tenant) throw new Error('❌ Tenant Maritimo not found');
        console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

        // 2. Find a teacher to assign subjects to (use any teacher in the tenant)
        const teacher = await User.findOne({ tenantId: tenant._id, role: 'teacher' });
        if (!teacher) throw new Error('❌ No teacher found in Maritimo tenant');
        console.log(`✅ Teacher for subjects: ${teacher.name} (${teacher._id})`);

        // 3. Find all courses in this tenant
        const courses = await Course.find({ tenantId: tenant._id });
        console.log(`✅ Found ${courses.length} courses`);

        let totalCreated = 0;
        let totalRemoved = 0;

        for (const course of courses) {
            console.log(`\n--- Course: ${course.name} ---`);

            // Remove old wrong subjects
            for (const oldName of OLD_NAMES_TO_REMOVE) {
                const removed = await Subject.findOneAndDelete({
                    tenantId: tenant._id,
                    courseId: course._id,
                    name: oldName
                });
                if (removed) {
                    console.log(`  ✗ Removed old subject: ${oldName}`);
                    totalRemoved++;
                }
            }

            // Create or verify correct subjects
            for (const sub of CORRECT_SUBJECTS) {
                const existing = await Subject.findOne({
                    tenantId: tenant._id,
                    courseId: course._id,
                    name: sub.name
                });

                if (existing) {
                    console.log(`  . Already exists: ${sub.name}`);
                } else {
                    await Subject.create({
                        tenantId: tenant._id,
                        courseId: course._id,
                        teacherId: teacher._id,
                        name: sub.name,
                        description: sub.description,
                        isTechnical: false
                    });
                    console.log(`  + Created: ${sub.name}`);
                    totalCreated++;
                }
            }
        }

        console.log(`\n🚀 COMPLETE! Created: ${totalCreated}, Removed: ${totalRemoved}`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected');
    }
}

harmonizeSubjects();
