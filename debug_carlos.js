
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Course from './src/models/courseModel.js';
import Estudiante from './src/models/estudianteModel.js';
import Enrollment from './src/models/enrollmentModel.js';

import fs from 'fs';

async function debugCarlos() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const tenant = await Tenant.findOne({ name: /maritimo/i });
        log('--- Tenant ---');
        log(tenant ? `ID: ${tenant._id}, Name: ${tenant.name}` : 'Not found');

        if (tenant) {
            const carlos = await User.findOne({
                tenantId: tenant._id,
                name: /carlos flores/i
            });
            log('\n--- Carlos Flores ---');
            log(carlos ? `ID: ${carlos._id}, Name: ${carlos.name}, Email: ${carlos.email}` : 'Not found');

            if (carlos) {
                const courses = await Course.find({
                    tenantId: tenant._id,
                    teacherId: carlos._id
                });
                log(`\n--- Courses Assigned (${courses.length}) ---`);
                courses.forEach(c => log(`ID: ${c._id}, Name: ${c.name}, Level: ${c.level}, CareerId: ${c.careerId}`));

                const courseIds = courses.map(c => c._id);
                const enrollments = await Enrollment.find({
                    tenantId: tenant._id,
                    courseId: { $in: courseIds }
                });
                log(`\n--- Total Students Enrolled: ${enrollments.length} ---`);

                // Group by course
                for (const c of courses) {
                    const count = enrollments.filter(e => e.courseId.toString() === c._id.toString()).length;
                    log(`Course ${c.name}: ${count} students`);
                }
            }

            // Other Carlos Flores
            const allCarlos = await User.find({ name: /carlos flores/i });
            log('\n--- All Users named Carlos Flores ---');
            allCarlos.forEach(u => log(`ID: ${u._id}, Tenant: ${u.tenantId}, Email: ${u.email}`));

            // Find all courses with /portuaria/i in name for this tenant
            const portCourses = await Course.find({ tenantId: tenant._id, name: /portua/i });
            log('\n--- Career Related Courses (Portuaria) ---');
            portCourses.forEach(c => log(`ID: ${c._id}, Name: ${c.name}, Teacher: ${c.teacherId}`));
        }

        fs.writeFileSync('debug_summary.txt', output);
        log('\n✅ Summary written to debug_summary.txt');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

debugCarlos();
