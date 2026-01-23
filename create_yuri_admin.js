import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/userModel.js';
import Tenant from './src/models/tenantModel.js';
import connectDB from './src/config/db.js';

dotenv.config();

const createYuriAdmin = async () => {
    try {
        await connectDB();
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
            console.log('✅ Tenant "Einsmart" created.');
        } else {
            console.log('✅ Tenant "Einsmart" found.');
        }

        // 2. Create or update Yuri admin
        const email = 'yuri@gmail.com';
        const password = '123456';
        const passwordHash = await bcrypt.hash(password, 10);

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            console.log(`User ${email} found. Updating...`);
            user.passwordHash = passwordHash;
            user.role = 'admin';
            user.name = 'Yuri Admin';
            user.tenantId = tenant._id;
            await user.save();
            console.log(`✅ ${email} updated successfully.`);
            console.log(`   Password: ${password}`);
        } else {
            console.log(`Creating user ${email}...`);
            await User.create({
                name: 'Yuri Admin',
                email: email.toLowerCase(),
                passwordHash,
                role: 'admin',
                tenantId: tenant._id
            });
            console.log(`✅ ${email} created successfully.`);
            console.log(`   Password: ${password}`);
        }

        console.log('\n✅ Setup complete!');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: admin`);
        console.log(`   Tenant: ${tenant.name} (${tenant._id})`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB.');
        process.exit(0);
    }
};

createYuriAdmin();
