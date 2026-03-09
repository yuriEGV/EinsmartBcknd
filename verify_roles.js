import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Career from './src/models/careerModel.js';
import Course from './src/models/courseModel.js';
import User from './src/models/userModel.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const career = await Career.findOne({ name: /operaciones portuarias/i })
            .populate('headTeacher', 'name')
            .populate('profesorJefe', 'name');

        console.log('--- Career ---');
        console.log(`Name: ${career.name}`);
        console.log(`Jefe de Carrera: ${career.headTeacher?.name || 'NONE'}`);
        console.log(`Profesor Jefe (Career Level): ${career.profesorJefe?.name || 'NONE'}`);

        const courses = await Course.find({ careerId: career._id })
            .populate('teacherId', 'name')
            .populate('collaborators', 'name');

        console.log('\n--- Courses ---');
        courses.forEach(c => {
            console.log(`Course ${c.name}: Prof. Jefe: ${c.teacherId?.name}, Collabs: ${c.collaborators?.map(col => col.name).join(', ') || 'None'}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

check();
