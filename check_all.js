
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Course from './src/models/courseModel.js';
import Estudiante from './src/models/estudianteModel.js';
import Enrollment from './src/models/enrollmentModel.js';
import Career from './src/models/careerModel.js';

import fs from 'fs';

async function checkAll() {
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
            const careers = await Career.find({ tenantId: tenant._id });
            log('\n--- Careers ---');
            careers.forEach(ca => log(`ID: ${ca._id}, Name: ${ca.name}`));

            const courses = await Course.find({ tenantId: tenant._id });
            log('\n--- All Courses ---');
            courses.forEach(c => log(`ID: ${c._id}, Name: ${c.name}, Teacher: ${c.teacherId}, Career: ${c.careerId}`));

            const studentCount = await Estudiante.countDocuments({ tenantId: tenant._id });
            log(`\nTotal Students in Tenant: ${studentCount}`);

            const enrollmentCount = await Enrollment.countDocuments({ tenantId: tenant._id });
            log(`Total Enrollments in Tenant: ${enrollmentCount}`);

            // Find students without enrollments
            const students = await Estudiante.find({ tenantId: tenant._id });
            let withoutEnrollment = 0;
            for (const s of students) {
                const e = await Enrollment.findOne({ estudianteId: s._id });
                if (!e) withoutEnrollment++;
            }
            log(`Students without enrollments: ${withoutEnrollment}`);
        }

        fs.writeFileSync('check_all_final.txt', output);
        log('\n✅ Results written to check_all_final.txt');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkAll();
