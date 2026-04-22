
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models (using absolute paths to be safe)
import Tenant from '../src/models/tenantModel.js';
import User from '../src/models/userModel.js';

async function init() {
    try {
        console.log('Connecting to MongoDB...');
        // Using credentials from .env but points to localhost
        const mongoURI = 'mongodb://einsmart_app:apppass2024@localhost:27017/Einsmart?authSource=admin';
        await mongoose.connect(mongoURI);
        console.log('Connected.');

        const tenantName = 'Instituto Bicentenario Maritimo Valparaiso';
        const tenant = await Tenant.findOne({ name: { $regex: tenantName, $options: 'i' } });

        if (!tenant) {
            console.error('Tenant not found:', tenantName);
            process.exit(1);
        }

        console.log(`Found Tenant: ${tenant.name} (${tenant._id})`);

        const result = await User.updateMany(
            { tenantId: tenant._id, adminDaysAllowed: { $exists: false } },
            { $set: { adminDaysAllowed: 6 } }
        );

        console.log(`Updated ${result.modifiedCount} users with default 6 admin days.`);
        
        // Also ensure role 'docente' and others have it if they exist
        const totalUsers = await User.countDocuments({ tenantId: tenant._id });
        console.log(`Total users in this tenant: ${totalUsers}`);

        process.exit(0);
    } catch (error) {
        console.error('Init error:', error);
        process.exit(1);
    }
}

init();
