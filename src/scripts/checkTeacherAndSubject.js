import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';

const checkTeacher = async () => {
    try {
        await connectDB();
        const teacherId = '69c849cf241c8833989bad13';
        const user = await User.findById(teacherId);
        console.log('User found:', JSON.stringify(user, null, 2));

        const subject = await Subject.findById('6984d436cf0ad7fa72d2e2b9');
        console.log('Subject found:', JSON.stringify(subject, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkTeacher();
