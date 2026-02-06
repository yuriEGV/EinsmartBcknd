
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function fix() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const result = await User.updateOne(
            { email: 'emilio@maritmo.cl' },
            { $set: { email: 'emilio@maritimo.cl' } }
        );
        console.log('Update result:', result);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

fix();
