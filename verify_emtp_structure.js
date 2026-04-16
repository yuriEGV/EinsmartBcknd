import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';
const T_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const { default: Subject } = await import('./src/models/subjectModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');

        const courses = await Course.find({ tenantId: T_ID, level: { $regex: /III|IV/i } });
        
        console.log(`\n🏫 INSTITUTO MARITIMO - ACADEMIC AUDIT\n`);
        
        for (const course of courses) {
            const count = await Subject.countDocuments({ courseId: course._id });
            const techCount = await Subject.countDocuments({ courseId: course._id, isTechnical: true });
            const genCount = await Subject.countDocuments({ courseId: course._id, isTechnical: false });
            
            console.log(`📘 ${course.name}`);
            console.log(`   - Total Subjects: ${count}`);
            console.log(`   - Technical:      ${techCount}`);
            console.log(`   - General:        ${genCount}`);
            console.log('-----------------------------');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
