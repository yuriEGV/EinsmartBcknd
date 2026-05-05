import mongoose from 'mongoose';
import User from '../src/models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        // Try both local and env
        const uri = 'mongodb://localhost:27017/Einsmart';
        await mongoose.connect(uri);
        const user = await User.findOne({ name: /Emilio/i });
        console.log('USER FOUND:', JSON.stringify(user, null, 2));
    } catch (e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}

run();
