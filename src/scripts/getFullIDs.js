import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import Tenant from '../models/tenantModel.js';

const getFullIDs = async () => {
    try {
        await connectDB();
        const tenants = await Tenant.find({ name: /Maritimo/i });
        tenants.forEach(t => {
            console.log(`TENANT_ID_RAW: ${t._id.toString()}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

getFullIDs();
