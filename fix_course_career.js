
import mongoose from 'mongoose';
import Course from './src/models/courseModel.js';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function fix() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const careerId = '6984c8fa3254496842aa365c'; // Operaciones Portuarias
        const courseNameQuery = /4.*I/i;

        const result = await Course.updateMany(
            { name: courseNameQuery, careerId: null },
            { $set: { careerId: new mongoose.Types.ObjectId(careerId) } }
        );

        console.log(`Updated ${result.modifiedCount} courses to career ${careerId}`);

        // Verify all courses in that career
        const courses = await Course.find({ careerId });
        console.log('\nAll courses now in Operaciones Portuarias:');
        courses.forEach(c => console.log(` - ${c.name} (Professor ID: ${c.teacherId})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
