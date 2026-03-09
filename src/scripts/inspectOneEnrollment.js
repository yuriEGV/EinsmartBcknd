import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Enrollment from '../models/enrollmentModel.js';

const inspectOneEnrollment = async () => {
    try {
        await connectDB();
        const enrollment = await Enrollment.findOne({ period: '2026' });
        console.log('Enrollment found:', JSON.stringify(enrollment, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectOneEnrollment();
