import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Schedule from '../models/scheduleModel.js';
import Course from '../models/courseModel.js';

const checkSchedules = async () => {
    try {
        await connectDB();
        
        console.log('--- ALL TEACHERS ---');
        const teachers = await User.find({ role: 'teacher' });
        teachers.forEach(t => console.log(`Teacher ID: ${t._id}, Name: ${t.name}, Email: ${t.email}`));

        console.log('\n--- ALL SUBJECTS ---');
        const subjects = await Subject.find().populate('teacherId', 'name').populate('courseId', 'name');
        subjects.forEach(s => console.log(`Subject ID: ${s._id}, Name: ${s.name}, Course: ${s.courseId?.name}, Teacher: ${s.teacherId?.name}`));

        console.log('\n--- ALL SCHEDULES ---');
        const schedules = await Schedule.find().populate('teacherId', 'name').populate('courseId', 'name').populate('subjectId', 'name');
        schedules.forEach(sc => console.log(`Schedule ID: ${sc._id}, Day: ${sc.dayOfWeek}, Block: ${sc.blockId}, Course: ${sc.courseId?.name}, Subject: ${sc.subjectId?.name}, Teacher: ${sc.teacherId?.name}`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkSchedules();
