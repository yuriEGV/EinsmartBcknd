
import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from './src/config/db.js';

async function fix() {
    await connectDB();
    console.log('Connected to DB');

    const estudianteCol = mongoose.connection.db.collection('estudiantes');
    const userCol = mongoose.connection.db.collection('users');

    console.log('\n--- Dropping global unique indexes ---');

    const drop = async (col, name) => {
        try {
            await col.dropIndex(name);
            console.log(`Dropped index: ${name} from ${col.collectionName}`);
        } catch (e) {
            console.log(`Index ${name} from ${col.collectionName} not found or already dropped`);
        }
    };

    await drop(estudianteCol, 'rut_1');
    await drop(estudianteCol, 'matricula_1');
    await drop(userCol, 'email_1');
    await drop(userCol, 'rut_1');

    console.log('\n--- Final Indexes (Estudiantes) ---');
    console.log(JSON.stringify(await estudianteCol.indexes(), null, 2));

    console.log('\n--- Final Indexes (Users) ---');
    console.log(JSON.stringify(await userCol.indexes(), null, 2));

    process.exit();
}

fix();
