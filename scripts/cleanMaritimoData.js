import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/userModel.js';
import Course from '../src/models/courseModel.js';
import Subject from '../src/models/subjectModel.js';
import Estudiante from '../src/models/estudianteModel.js';
import Enrollment from '../src/models/enrollmentModel.js';
import Evaluation from '../src/models/evaluationModel.js';
import Grade from '../src/models/gradeModel.js';
import Rubric from '../src/models/rubricModel.js';
import Question from '../src/models/questionModel.js';
import Planning from '../src/models/planningModel.js';
import Objective from '../src/models/objectiveModel.js';
import Tenant from '../src/models/tenantModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const cleanData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const tenantId = '6984af03b00f020e9834b948';
        const teacherEmails = [
            `profe.mecanica.${tenantId}@maritimo.cl`,
            `profe.gastro.${tenantId}@maritimo.cl`,
            `profe.quimica.${tenantId}@maritimo.cl`,
            `profe.puertos.${tenantId}@maritimo.cl`,
            `profe.alimentos.${tenantId}@maritimo.cl`
        ];

        for (const email of teacherEmails) {
            console.log(`Cleaning data for ${email}...`);
            const teacher = await User.findOne({ email });
            if (!teacher) {
                console.log(`  No teacher found, skipping.`);
                continue;
            }

            // Find associated course and subject
            const course = await Course.findOne({ teacherId: teacher._id });
            const subject = await Subject.findOne({ teacherId: teacher._id });

            // Delete students
            if (course) {
                const enrollments = await Enrollment.find({ courseId: course._id });
                for (const enr of enrollments) {
                    const studentId = enr.estudianteId;
                    await Grade.deleteMany({ estudianteId: studentId });
                    await User.deleteOne({ profileId: studentId, role: 'student' });
                    await Estudiante.deleteOne({ _id: studentId });
                }
                await Enrollment.deleteMany({ courseId: course._id });
                await Evaluation.deleteMany({ courseId: course._id });
                await Course.deleteOne({ _id: course._id });
                console.log(`  Deleted course ${course.name}`);
            }

            // Delete planning/rubrics/questions
            if (subject) {
                await Planning.deleteMany({ subjectId: subject._id });
                await Rubric.deleteMany({ subjectId: subject._id });
                await Question.deleteMany({ subjectId: subject._id });
                await Objective.deleteMany({ subjectId: subject._id });
                await Subject.deleteOne({ _id: subject._id });
                console.log(`  Deleted subject ${subject.name}`);
            }

            // Delete teacher
            await User.deleteOne({ _id: teacher._id });
            console.log(`  Deleted teacher ${teacher.name}`);
        }

        console.log('✅ All data cleaned successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

cleanData();
