import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Tenant from '../models/tenantModel.js';

async function updateLogo() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tenant = await Tenant.findOne({ name: { $regex: /maritimo|marítimo/i } });
        if (tenant) {
            if (!tenant.theme) tenant.theme = {};
            tenant.theme.logoUrl = '/logo-maritimo.jpg';
            await tenant.save();
            console.log('Logo updated for:', tenant.name);
        } else {
            console.log('Instituto Maritimo not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

updateLogo();
