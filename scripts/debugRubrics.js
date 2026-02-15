
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/userModel.js';
import Rubric from '../src/models/rubricModel.js';
import Tenant from '../src/models/tenantModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const debugRubrics = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to DB');

        // 1. Find Tenant
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        if (!tenant) {
            console.log('❌ Tenant not found!');
            process.exit(1);
        }
        console.log(`Checking Tenant: ${tenant.name} (${tenant._id})`);

        // 2. Count Rubrics
        const rubrics = await Rubric.find({ tenantId: tenant._id });
        console.log(`Found ${rubrics.length} rubrics for this tenant.`);
        rubrics.forEach(r => console.log(`- ${r.title} (Teacher: ${r.teacherId})`));

        // 3. Find Emilio
        // Try to find a user with role 'director' or name containing 'Emilio' or 'Director'
        const users = await User.find({
            tenantId: tenant._id,
            $or: [
                { role: 'director' },
                { role: 'admin' },
                { name: { $regex: 'Director', $options: 'i' } },
                { email: { $regex: 'director', $options: 'i' } }
            ]
        });

        console.log(`Found ${users.length} potential Director/Admin users:`);
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, Role: '${u.role}', Tenant: ${u.tenantId}`);
            // Check if Tenant IDs match strictly
            if (u.tenantId.toString() !== tenant._id.toString()) {
                console.log(`  ⚠️ MISMATCH: User Tenant ${u.tenantId} != Target ${tenant._id}`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugRubrics();
