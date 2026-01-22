import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Grade from '../models/gradeModel.js';
import Evaluation from '../models/evaluationModel.js';
import Estudiante from '../models/estudianteModel.js';
import NotificationService from '../services/notificationService.js';

dotenv.config();

async function testNotification() {
    try {
        console.log('🧪 Testing Notification System...');
        await mongoose.connect(process.env.MONGO_URI);

        const student = await Estudiante.findOne({ nombres: 'Gabriele' });
        if (!student) throw new Error('Student not found. Run seed first.');

        // 1. Create a dummy evaluation if needed
        let eval_item = await Evaluation.findOne({ title: 'Prueba de Diagnóstico' });
        if (!eval_item) {
            eval_item = await Evaluation.create({
                title: 'Prueba de Diagnóstico',
                maxScore: 7,
                subject: 'Matemáticas',
                date: new Date(),
                courseId: new mongoose.Types.ObjectId(), // dummy
                tenantId: student.tenantId
            });
        }

        console.log('📝 Creating a new Grade...');
        // This should trigger the notification service automatically because of our hooks in GradeController
        // But since we are bypassing the controller here, we call the service manually or use the controller logic

        const grade = new Grade({
            estudianteId: student._id,
            evaluationId: eval_item._id,
            score: 6.5,
            tenantId: student.tenantId
        });
        await grade.save();

        console.log('📧 Triggering email notification...');
        await NotificationService.notifyNewGrade(
            student._id,
            6.5,
            'Matemáticas',
            'Prueba de Diagnóstico',
            student.tenantId
        );

        console.log('✅ Notification triggered. Check your email!');
        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Notification test error:', error);
    }
}

testNotification();
