import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Subject from '../models/subjectModel.js';
import User from '../models/userModel.js';
import Tenant from '../models/tenantModel.js';

const listAllSubjects = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        console.log('Tenant:', tenant?.name, 'ID:', tenant?._id);

        const subjects = await Subject.find({ tenantId: tenant._id }).populate('courseId');
        console.log('Subjects found:', subjects.length);

        for (const s of subjects) {
            const teacher = await User.findById(s.teacherId);
            console.log(`- ${s.name} | Course: ${s.courseId?.name} | Teacher: ${teacher?.name} | UserID: ${s.teacherId} | SubjID: ${s._id}`);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listAllSubjects();
