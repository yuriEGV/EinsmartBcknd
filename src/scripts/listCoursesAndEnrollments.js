import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Course from '../models/courseModel.js';
import Tenant from '../models/tenantModel.js';
import Enrollment from '../models/enrollmentModel.js';

const listCoursesAndEnrollments = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        const courses = await Course.find({ tenantId: tenant._id });

        console.log(`Courses for ${tenant.name}:`);
        for (const c of courses) {
            const count = await Enrollment.countDocuments({ courseId: c._id });
            console.log(`- ${c.name} | ID: ${c._id} | Enrollments: ${count}`);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listCoursesAndEnrollments();
