
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from './src/config/db.js';

async function fix() {
    await connectDB();
    console.log('Connected to DB');

    const collection = mongoose.connection.db.collection('estudiantes');

    console.log('\n--- Dropping global unique indexes ---');
    try {
        await collection.dropIndex('rut_1');
        console.log('Dropped index: rut_1');
    } catch (e) {
        console.log('Index rut_1 not found or already dropped');
    }

    try {
        await collection.dropIndex('matricula_1');
        console.log('Dropped index: matricula_1');
    } catch (e) {
        console.log('Index matricula_1 not found or already dropped');
    }

    console.log('\n--- Final Indexes ---');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    process.exit();
}

fix();
