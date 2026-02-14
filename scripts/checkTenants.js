
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Tenant from '../src/models/tenantModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const listTenants = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        const tenants = await Tenant.find({}, 'name domain _id');
        console.log('Existing Tenants:');
        tenants.forEach(t => console.log(`- ${t.name} (ID: ${t._id}, Domain: ${t.domain})`));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listTenants();
