import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Enrollment from '../models/enrollmentModel.js';
import Course from '../models/courseModel.js';

const inspectEnrollments = async () => {
    try {
        await connectDB();
        const course = await Course.findOne({ name: '3° MedioE' });
        if (course) {
            console.log('Course:', course.name, 'ID:', course._id);
            const enrollments = await Enrollment.find({ courseId: course._id });
            console.log('Enrollments found:', enrollments.length);
            if (enrollments.length > 0) {
                console.log('Sample Enrollment:', JSON.stringify(enrollments[0], null, 2));
            }
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectEnrollments();
