
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EnrollmentController from '../src/controllers/enrollmentController.js';
import Estudiante from '../src/models/estudianteModel.js';
import Apoderado from '../src/models/apoderadoModel.js';
import Payment from '../src/models/paymentModel.js';
import PaymentPromise from '../src/models/paymentPromiseModel.js';
import User from '../src/models/userModel.js';
import Tenant from '../src/models/tenantModel.js';

dotenv.config();

// Mock Express Request/Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    res.send = () => res;
    return res;
};

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Cleanup previous test data
        // await Estudiante.deleteMany({ email: 'test.student@example.com' });

        // 1. Setup Data
        const tenant = await Tenant.findOne();
        const tenantId = tenant._id;

        // Create Sostenedor User
        let sostenedor = await User.findOne({ email: 'sostenedor@test.com' });
        if (!sostenedor) {
            sostenedor = await User.create({
                tenantId,
                name: 'Sostenedor Test',
                email: 'sostenedor@test.com',
                passwordHash: 'hash',
                role: 'sostenedor'
            });
        }

        // Create Student
        let student = await Estudiante.findOne({ email: 'debter@test.com' });
        if (!student) {
            student = await Estudiante.create({
                tenantId,
                nombres: 'Debter',
                apellidos: 'Student',
                rut: '99.999.999-9',
                email: 'debter@test.com',
                grado: '1M'
            });
        }

        // Create Guardian
        let guardian = await Apoderado.findOne({ correo: 'guardian@test.com' });
        if (!guardian) {
            guardian = await Apoderado.create({
                tenantId,
                estudianteId: student._id,
                nombre: 'Guardian',
                apellidos: 'Test',
                correo: 'guardian@test.com',
                telefono: '123456789'
            });
        }

        // 2. Create OLD Debt (> 3 months)
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

        await Payment.create({
            tenantId,
            estudianteId: student._id,
            tariffId: new mongoose.Types.ObjectId(), // Fake tariff ID
            concepto: 'Mensualidad Antigua',
            amount: 50000,
            metodoPago: 'efectivo',
            estado: 'vencido',
            fechaVencimiento: fourMonthsAgo
        });

        console.log('Setup complete. Testing Blocking...');

        // 3. Test 1: Enroll Attempt with Debt (Should Block)
        const req1 = {
            user: { tenantId, role: 'apoderado' },
            body: {
                studentId: student._id,
                courseId: new mongoose.Types.ObjectId(), // Fake course
                period: '2026',
                apoderadoId: guardian._id,
                status: 'pendiente'
            }
        };
        const res1 = mockRes();

        await EnrollmentController.createEnrollment(req1, res1);

        console.log('Test 1 (Expect 403 Block):', res1.statusCode, res1.body?.code);
        if (res1.statusCode === 403 && res1.body?.code === 'DEBT_BLOCK') {
            console.log('PASS: Enrolment blocked due to debt.');
        } else {
            console.error('FAIL: Enrolment was not blocked correctly.');
        }

        // 4. Test 2: Enroll with Promise as Sostenedor (Should Pass)
        console.log('Testing Sostenedor Override...');
        const req2 = {
            user: { tenantId, role: 'sostenedor', userId: sostenedor._id },
            body: {
                studentId: student._id,
                courseId: new mongoose.Types.ObjectId(), // Fake course, might fail validation if controller checks existance strictly, let's see
                period: '2026',
                apoderadoId: guardian._id,
                status: 'confirmada',
                paymentPromise: {
                    amount: 50000,
                    promiseDate: new Date(),
                    notes: 'Will pay tomorrow'
                }
            }
        };
        const res2 = mockRes();

        // Note: Controller checks if courseId exists? No, it just saves it in the model usually, but let's check validation.
        // It does `await enrollment.save()` so foreign keys might not fail unless mongoose validates refs strictly *if* they are populated? 
        // Actually mongoose refs don't enforce Referential Integrity by default unless using a plugin or explicit check.
        // However, the controller does `if (!finalStudentId || !courseId ...)` so we need them in body.

        await EnrollmentController.createEnrollment(req2, res2);

        console.log('Test 2 (Expect 201 Created):', res2.statusCode);
        if (res2.statusCode === 201) {
            console.log('PASS: Enrolment allowed with Sostenedor promise.');

            // Verify Promise Created
            const promise = await PaymentPromise.findOne({ studentId: student._id });
            if (promise) {
                console.log('PASS: PaymentPromise record created.');
            } else {
                console.error('FAIL: PaymentPromise record NOT found.');
            }
        } else {
            console.error('FAIL: Enrolment failed:', res2.body);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
