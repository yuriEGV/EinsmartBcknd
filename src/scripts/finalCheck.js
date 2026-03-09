import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Estudiante from '../models/estudianteModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Course from '../models/courseModel.js';
import Tenant from '../models/tenantModel.js';

const finalCheck = async () => {
    try {
        await connectDB();
        const officialTenantId = new mongoose.Types.ObjectId('69c849cf241c8833989ba626');

        const studentCount = await Estudiante.countDocuments({ tenantId: officialTenantId });
        console.log(`Students in Official Tenant: ${studentCount}`);

        const enrollmentCount = await Enrollment.countDocuments({ tenantId: officialTenantId });
        console.log(`Enrollments in Official Tenant: ${enrollmentCount}`);

        const courseCount = await Course.countDocuments({ tenantId: officialTenantId });
        console.log(`Courses in Official Tenant: ${courseCount}`);

        const courseList = await Course.find({ tenantId: officialTenantId });
        for (const c of courseList) {
            const eCount = await Enrollment.countDocuments({ courseId: c._id });
            const sCount = await Subject.countDocuments({ courseId: c._id });
            console.log(`- Course: ${c.name} | Enrollments: ${eCount} | Subjects: ${sCount} | ID: ${c._id}`);
        }

        const teacherId = new mongoose.Types.ObjectId('69c849cf241c8833989bad13');
        const teacherSubjects = await Subject.find({ teacherId });
        console.log(`Subjects for Carlos Flores: ${teacherSubjects.length}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

finalCheck();
