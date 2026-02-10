
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Tenant from './src/models/tenantModel.js';

async function updateMaritimo() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const maritimo = await Tenant.findOne({ name: /maritimo/i });
        if (maritimo) {
            maritimo.emailConfig = {
                senderEmail: 'info@imaritimo.cl',
                senderName: 'Maritimo 4.0',
                replyTo: 'info@imaritimo.cl'
            };
            await maritimo.save();
            console.log('✅ Maritimo tenant updated:', maritimo.name);
        } else {
            console.log('❌ Maritimo tenant not found');
        }
    } catch (err) {
        console.error('❌ Error updating maritimo:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

updateMaritimo();
