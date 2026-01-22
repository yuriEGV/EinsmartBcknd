
import mongoose from 'mongoose';
import User from './src/models/userModel.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ No MONGO_URI found in .env");
    process.exit(1);
}

console.log(`Attempting to connect to DB... (URI length: ${mongoUri.length})`);

mongoose.connect(mongoUri)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            const users = await User.find({});
            console.log(`\nFound ${users.length} users:`);
            users.forEach(u => {
                console.log(`- Email: ${u.email} | Role: ${u.role} | ID: ${u._id}`);
            });

            if (users.length === 0) {
                console.log("\n⚠️ No users found! You need to register a user first.");
            }

        } catch (err) {
            console.error("Error querying users:", err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('❌ Connection Failed:', err.message);
        console.log("Possible causes:\n1. IP not whitelisted in Atlas.\n2. Wrong username/password in URI.\n3. Network firewall.");
    });
