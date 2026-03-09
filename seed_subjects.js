
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Models
import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Course from './src/models/courseModel.js';
import Subject from './src/models/subjectModel.js';

dotenv.config();

async function seedSubjects() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('❌ Falta MONGO_URI');

        await mongoose.connect(uri);
        console.log('✅ Connected to DB');

        // 1. Find Tenant
        const tenant = await Tenant.findOne({ name: /instituto/i, name: /maritimo/i });
        if (!tenant) throw new Error('❌ Tenant Maritimo not found');
        console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

        // 2. Find Teacher (Carlos Flores)
        const carlos = await User.findOne({ tenantId: tenant._id, name: /carlos flores/i });
        if (!carlos) throw new Error('❌ Teacher Carlos Flores must exist.');
        console.log(`✅ Teacher: ${carlos.name} (${carlos._id})`);

        // 3. Find Courses in this tenant
        const courses = await Course.find({ tenantId: tenant._id });
        console.log(`✅ Found ${courses.length} courses to populate.`);

        const basicSubjects = [
            {
                name: "Lengua y Literatura",
                description: "Enfoque en comunicación oral y escrita.",
                isTechnical: false
            },
            {
                name: "Matemática",
                description: "Desarrollo del pensamiento lógico y resolución de problemas.",
                isTechnical: false
            },
            {
                name: "Educación Ciudadana",
                description: "Formación en derechos, deberes y participación social.",
                isTechnical: false
            },
            {
                name: "Filosofía",
                description: "Reflexión crítica y ética.",
                isTechnical: false
            },
            {
                name: "Inglés",
                description: "Herramientas de comunicación en idioma extranjero.",
                isTechnical: false
            },
            {
                name: "Ciencias para la Ciudadanía",
                description: "Aplicación de conocimientos científicos a la vida cotidiana (biología, física, química).",
                isTechnical: false
            },
            {
                name: "Educación Física y Salud",
                description: "Promoción de vida sana y actividad física.",
                isTechnical: false
            }
        ];

        for (const course of courses) {
            console.log(`\n--- Populating Course: ${course.name} ---`);
            for (const sub of basicSubjects) {
                try {
                    // Check if exists
                    const existing = await Subject.findOne({
                        tenantId: tenant._id,
                        courseId: course._id,
                        name: sub.name
                    });

                    if (existing) {
                        console.log(`  . Subject exists: ${sub.name}`);
                        continue;
                    }

                    await Subject.create({
                        tenantId: tenant._id,
                        courseId: course._id,
                        teacherId: carlos._id,
                        name: sub.name,
                        description: sub.description,
                        isTechnical: sub.isTechnical
                    });
                    console.log(`  + Created: ${sub.name}`);
                } catch (err) {
                    console.error(`  ❌ Error creating ${sub.name}:`, err.message);
                }
            }
        }

        console.log('\n🚀 SUBJECT SEEDING COMPLETE!');

    } catch (err) {
        console.error('❌ SEEDING FAILED:');
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

seedSubjects();
