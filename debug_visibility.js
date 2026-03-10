
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import User from './src/models/userModel.js';
import Career from './src/models/careerModel.js';
import Course from './src/models/courseModel.js';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function debug() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const carlos = await User.findOne({ name: /Carlos Flores/i });
        if (!carlos) {
            console.log('Carlos Flores not found');
            return;
        }
        console.log('Carlos Flores ID:', carlos._id);

        const careers = await Career.find({ tenantId: carlos.tenantId });
        console.log('Found Careers:', careers.length);
        careers.forEach(c => {
            console.log(`Career: ${c.name}, ID: ${c._id}, headTeacher: ${c.headTeacher}, profesorJefe: ${c.profesorJefe}`);
        });

        const courses = await Course.find({ tenantId: carlos.tenantId });
        console.log('Found Courses:', courses.length);
        courses.forEach(c => {
            if (c.name.includes('4') && c.letter === 'I' || c.name.includes('4° I')) {
                 console.log(`Course Found: ${c.name}, ID: ${c._id}, careerId: ${c.careerId}, teacherId: ${c.teacherId}`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
