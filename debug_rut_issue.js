
import mongoose from 'mongoose';
import 'dotenv/config';
import Estudiante from './src/models/estudianteModel.js';
import connectDB from './src/config/db.js';

async function debug() {
    await connectDB();
    console.log('Connected to DB');

    const rutToSearch = '12.345.678-5';

    console.log(`\n--- Searching for RUT: ${rutToSearch} ---`);
    const allMatches = await Estudiante.find({ rut: rutToSearch });
    console.log(`Found ${allMatches.length} matches:`);
    allMatches.forEach(m => {
        console.log(`- ID: ${m._id}, TenantId: ${m.tenantId}, Name: ${m.nombres} ${m.apellidos}`);
    });

    console.log('\n--- Collection Indexes ---');
    const indexes = await mongoose.connection.db.collection('estudiantes').indexes();
    console.log(JSON.stringify(indexes, null, 2));

    process.exit();
}

debug();
