import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Tenant from '../models/tenantModel.js';

const listTeachers = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        const teachers = await User.find({ tenantId: tenant._id, role: 'teacher' }).select('name email');

        console.log('Teachers in Tenant:');
        teachers.forEach(t => console.log(`- ${t.name} (${t.email})`));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listTeachers();
