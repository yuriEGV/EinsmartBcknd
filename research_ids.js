
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Tenant from './src/models/tenantModel.js';
import User from './src/models/userModel.js';
import Career from './src/models/careerModel.js';
import Course from './src/models/courseModel.js';

async function research() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const tenant = await Tenant.findOne({ name: /maritimo/i });
        console.log('--- Tenant ---');
        console.log(tenant ? `ID: ${tenant._id}, Name: ${tenant.name}` : 'Not found');

        if (tenant) {
            const career = await Career.findOne({ tenantId: tenant._id, name: /portuaria/i });
            console.log('\n--- Career ---');
            console.log(career ? `ID: ${career._id}, Name: ${career.name}` : 'Not found');

            const teachers = await User.find({
                tenantId: tenant._id,
                role: 'teacher',
                name: { $in: [/carlos flores/i, /erwin cubillos/i] }
            });
            console.log('\n--- Teachers ---');
            teachers.forEach(t => console.log(`ID: ${t._id}, Name: ${t.name}`));

            const courses = await Course.find({ tenantId: tenant._id });
            console.log('\n--- Existing Courses ---');
            courses.forEach(c => console.log(`ID: ${c._id}, Name: ${c.name}`));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

research();
