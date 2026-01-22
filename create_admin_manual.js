
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/userModel.js';
import Tenant from './src/models/tenantModel.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error("❌ No MONGO_URI found in .env");
    process.exit(1);
}

const createAdmins = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Ensure Tenant
        let tenant = await Tenant.findOne({ name: 'Einsmart' });
        if (!tenant) {
            console.log('Creating Tenant "Einsmart"...');
            tenant = await Tenant.create({
                name: 'Einsmart',
                domain: 'einsmart.cl',
                theme: { primaryColor: '#3b82f6', secondaryColor: '#1e293b' }
            });
        } else {
            console.log('✅ Tenant "Einsmart" found.');
        }

        const admins = [
            { name: 'Yuri Admin', email: 'yuri@einsmart.cl', rut: '1-9' },
            { name: 'Vicente Admin', email: 'vicente@einsmart.cl', rut: '2-7' }
        ];

        for (const admin of admins) {
            const password = '123456';
            const passwordHash = await bcrypt.hash(password, 10);

            let user = await User.findOne({ email: admin.email });
            if (user) {
                console.log(`User ${admin.email} found. Updating...`);
                user.passwordHash = passwordHash;
                user.role = 'admin';
                user.name = admin.name;
                user.tenantId = tenant._id;
                await user.save();
                console.log(`✅ ${admin.name} updated successfully.`);
            } else {
                console.log(`Creating user ${admin.email}...`);
                await User.create({
                    name: admin.name,
                    email: admin.email,
                    passwordHash,
                    role: 'admin',
                    tenantId: tenant._id,
                    rut: admin.rut
                });
                console.log(`✅ ${admin.name} created successfully.`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

createAdmins();
