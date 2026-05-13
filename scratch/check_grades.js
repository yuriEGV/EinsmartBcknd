import mongoose from 'mongoose';
import Grade from '../src/models/gradeModel.js';
import Evaluation from '../src/models/evaluationModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkGrades() {
    try {
        // Use localhost since we are running outside docker
        const uri = 'mongodb://einsmart_app:apppass2024@localhost:27017/Einsmart?authSource=admin';
        await mongoose.connect(uri);
        console.log('Connected to DB:', uri);

        const Course = (await import('../src/models/courseModel.js')).default;
        const courses = await Course.find({ name: /4.*Medio.*I/i });
        
        if (courses.length === 0) {
            console.log('Course not found');
            return;
        }

        for (const course of courses) {
            console.log('\n--- Checking Course:', course.name, `(${course._id}) ---`);
            const evals = await Evaluation.find({ courseId: course._id });
            console.log(`Found ${evals.length} evaluations`);
            
            for (const e of evals) {
                const count = await Grade.countDocuments({ evaluationId: e._id });
                console.log(` - [${e.title}] ID: ${e._id} | Subject: ${e.subjectId} | Grades Count: ${count}`);
                if (count > 0) {
                    const grades = await Grade.find({ evaluationId: e._id }).limit(3);
                    grades.forEach(g => {
                        console.log(`   - Grade: ${g.score} | Student: ${g.estudianteId}`);
                    });
                }
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkGrades();
