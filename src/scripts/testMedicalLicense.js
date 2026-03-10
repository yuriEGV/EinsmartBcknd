import mongoose from 'mongoose';
import MedicalLicense from '../models/medicalLicenseModel.js';
import Attendance from '../models/attendanceModel.js';
import Grade from '../models/gradeModel.js';
import Evaluation from '../models/evaluationModel.js';
import connectDB from '../config/db.js';

async function test() {
    try {
        await connectDB();
        console.log('Connected to DB');

        const tenantId = new mongoose.Types.ObjectId(); // Mock tenant
        const studentId = new mongoose.Types.ObjectId(); // Mock student
        const staffId = new mongoose.Types.ObjectId(); // Mock staff

        // 1. Create a Medical License for a student
        console.log('\n--- Testing Student License ---');
        const start = new Date('2026-03-10');
        const end = new Date('2026-03-12');
        
        const license = await MedicalLicense.create({
            tenantId,
            userId: studentId,
            userType: 'Estudiante',
            fechaInicio: start,
            fechaFin: end,
            diasReposo: 3,
            tipo: 'Médica',
            estado: 'Aprobado'
        });
        console.log('Created license for student:', license._id);

        // 2. Verify auto-justification in Attendance
        const attendanceDate = new Date('2026-03-11');
        // This would usually be called from the controller, but here we simulate the logic
        const activeLicense = await MedicalLicense.findOne({
            tenantId,
            userId: studentId,
            fechaInicio: { $lte: attendanceDate },
            fechaFin: { $gte: attendanceDate },
            estado: 'Aprobado'
        });
        
        console.log('Active license found for 2026-03-11:', !!activeLicense);
        if (activeLicense) {
            console.log('Status would be set to "justificado"');
        }

        // 3. Testing Staff Limit
        console.log('\n--- Testing Staff Limit ---');
        const longLicense = await MedicalLicense.create({
            tenantId,
            userId: staffId,
            userType: 'Funcionario',
            fechaInicio: new Date('2025-01-01'),
            fechaFin: new Date('2025-07-01'), // 6 months
            diasReposo: 181,
            tipo: 'Médica',
            estado: 'Aprobado'
        });
        
        const pastLicenses = await MedicalLicense.find({
            userId: staffId,
            tenantId,
            fechaInicio: { $gte: new Date('2024-01-01') }
        });
        const totalPastDays = pastLicenses.reduce((acc, curr) => acc + curr.diasReposo, 0);
        console.log('Total license days for staff in 2 years:', totalPastDays);
        if (totalPastDays > 180) {
            console.log('WARNING: Vacancy risk detected correctly');
        }

        // Cleanup
        await MedicalLicense.deleteMany({ tenantId });
        console.log('\nCleanup done');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
