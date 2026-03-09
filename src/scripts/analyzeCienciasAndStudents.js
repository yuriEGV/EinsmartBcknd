import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Subject from '../models/subjectModel.js';
import Course from '../models/courseModel.js';
import Tenant from '../models/tenantModel.js';
import Estudiante from '../models/estudianteModel.js';
import Enrollment from '../models/enrollmentModel.js';

const analyzeCiencias = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        const subjects = await Subject.find({
            tenantId: tenant._id,
            name: { $regex: /Ciencias para la Ciudadanía/i }
        }).populate('courseId');

        console.log('Found "Ciencias para la Ciudadanía" subjects:');
        subjects.forEach(s => {
            console.log(`- ID: ${s._id} | Course: ${s.courseId?.name} | Teacher: ${s.teacherId}`);
        });

        const studentCount = await Estudiante.find({ tenantId: tenant._id }).countDocuments();
        console.log(`Total students in tenant: ${studentCount}`);

        const course3E = await Course.findOne({ name: '3° MedioE', tenantId: tenant._id });
        if (course3E) {
            const enrollments = await Enrollment.find({ courseId: course3E._id }).countDocuments();
            console.log(`Enrollments in 3° MedioE: ${enrollments}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

analyzeCiencias();
