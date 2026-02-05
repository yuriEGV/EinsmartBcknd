import 'dotenv/config';
import mongoose from 'mongoose';
import Estudiante from './src/models/estudianteModel.js';
import User from './src/models/userModel.js';
import connectDB from './src/config/db.js';

async function checkStudents() {
    await connectDB();
    console.log('Connected to DB');

    // Check what tenant "sostenedor" might be seeing
    // We don't have the user context here easily unless we fetch a user
    // Let's just dump all students
    const students = await Estudiante.find({});
    console.log(`Total Students: ${students.length}`);

    if (students.length > 0) {
        console.log('Sample Students:');
        students.slice(0, 5).forEach(s => console.log(`${s.nombres} ${s.apellidos} (Tenant: ${s.tenantId})`));
    }

    // Check searching "marisol"
    const search = await Estudiante.find({
        $or: [
            { nombres: { $regex: 'marisol', $options: 'i' } },
            { apellidos: { $regex: 'marisol', $options: 'i' } }
        ]
    });
    console.log(`\nResults for 'marisol': ${search.length}`);
    search.forEach(s => console.log(`Found: ${s.nombres} ${s.apellidos}`));

    process.exit();
}

checkStudents();
