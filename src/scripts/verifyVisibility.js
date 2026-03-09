import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Tenant from '../models/tenantModel.js';

const verifyVisibility = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        const teacher = await User.findOne({ name: /Carlos Flores/i, tenantId: tenant._id });

        if (!teacher) {
            console.log('Teacher not found');
            process.exit(1);
        }

        console.log(`Teacher: ${teacher.name} (${teacher._id})`);

        const mySubjects = await Subject.find({ teacherId: teacher._id, tenantId: tenant._id });
        console.log(`Subjects assigned to teacher: ${mySubjects.length}`);
        mySubjects.forEach(s => console.log(`- ${s.name}`));

        const courseIds = [...new Set(mySubjects.map(s => s.courseId.toString()))];
        console.log(`Courses taught by teacher: ${courseIds.length}`);

        const enrollments = await Enrollment.find({
            courseId: { $in: courseIds },
            tenantId: tenant._id,
            status: { $in: ['confirmada', 'activo', 'activa'] }
        });
        console.log(`Students found in teacher's courses via enrollments: ${enrollments.length}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verifyVisibility();
