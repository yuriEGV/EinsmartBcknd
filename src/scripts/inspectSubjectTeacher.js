import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Subject from '../models/subjectModel.js';
import User from '../models/userModel.js';

const inspectSubject = async () => {
    try {
        await connectDB();
        const subject = await Subject.findOne({ name: /Ciencias para la Ciudadanía/i });
        if (subject) {
            console.log('Subject Details:', JSON.stringify(subject, null, 2));
            const teacher = await User.findById(subject.teacherId);
            console.log('Teacher for this subject:', teacher?.name, 'Role:', teacher?.role);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectSubject();
