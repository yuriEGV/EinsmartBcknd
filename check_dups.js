import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from './src/config/db.js';
import Subject from './src/models/subjectModel.js';

const checkDups = async () => {
    try {
        await connectDB();
        const dups = await Subject.aggregate([
            {
                $group: {
                    _id: { tenantId: '$tenantId', courseId: '$courseId', name: '$name' },
                    count: { $sum: 1 },
                    ids: { $push: '$_id' },
                    teachers: { $push: '$teacherId' }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);
        console.log(JSON.stringify(dups, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDups();
