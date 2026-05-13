import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Grade from '../src/models/gradeModel.js';
import Evaluation from '../src/models/evaluationModel.js';
import Anotacion from '../src/models/anotacionModel.js';
import Attendance from '../src/models/attendanceModel.js';
import Atraso from '../src/models/atrasoModel.js';
import MedicalLicense from '../src/models/medicalLicenseModel.js';

dotenv.config();

async function check() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('No MONGO_URI found in .env');
        
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const models = [
            { name: 'Grade', model: Grade },
            { name: 'Evaluation', model: Evaluation },
            { name: 'Anotacion', model: Anotacion },
            { name: 'Attendance', model: Attendance },
            { name: 'Atraso', model: Atraso },
            { name: 'MedicalLicense', model: MedicalLicense }
        ];

        for (const m of models) {
            const count = await m.model.countDocuments({ academicYear: { $exists: false } });
            console.log(`${m.name} without academicYear:`, count);
            if (count > 0) {
                console.log(`Migrating ${m.name} records to academicYear 2026...`);
                await m.model.updateMany({ academicYear: { $exists: false } }, { $set: { academicYear: 2026 } });
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

check();
