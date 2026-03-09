import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Tenant from '../models/tenantModel.js';

const checkTenants = async () => {
    try {
        await connectDB();
        const tenants = await Tenant.find({ name: /Maritimo/i });
        console.log('Tenants found:', JSON.stringify(tenants, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkTenants();
