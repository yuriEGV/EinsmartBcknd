
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';
import Tenant from './src/models/tenantModel.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

const setupFriendlySchool = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // 1. Find or Create Tenant
        let tenant = await Tenant.findOne({ name: { $regex: /friendly/i } });
        if (!tenant) {
            console.log('Creating Tenant "Friendly High School"...');
            tenant = await Tenant.create({
                name: 'Friendly High School',
                domain: 'friendly.cl',
                theme: { primaryColor: '#10b981', secondaryColor: '#064e3b' }
            });
        } else {
            console.log(`✅ Tenant found: ${tenant.name}`);
        }

        const password = '123456';
        const passwordHash = await bcrypt.hash(password, 10);

        // 2. Create/Update Sostenedor
        const sostenedorEmail = 'sostenedor@friendly.cl';
        let sostenedor = await User.findOne({ email: sostenedorEmail });

        if (sostenedor) {
            sostenedor.passwordHash = passwordHash;
            sostenedor.tenantId = tenant._id;
            sostenedor.role = 'sostenedor';
            await sostenedor.save();
            console.log('🔄 Sostenedor updated');
        } else {
            sostenedor = await User.create({
                name: 'Sostenedor Friendly',
                email: sostenedorEmail,
                passwordHash,
                role: 'sostenedor',
                tenantId: tenant._id,
                rut: '11.111.111-1'
            });
            console.log('✅ Sostenedor created');
        }

        // 3. Create/Update Teacher
        const teacherEmail = 'profe@friendly.cl';
        let teacher = await User.findOne({ email: teacherEmail });

        if (teacher) {
            teacher.passwordHash = passwordHash;
            teacher.tenantId = tenant._id;
            teacher.role = 'teacher';
            await teacher.save();
            console.log('🔄 Teacher updated');
        } else {
            teacher = await User.create({
                name: 'Profesor Friendly',
                email: teacherEmail,
                passwordHash,
                role: 'teacher',
                tenantId: tenant._id,
                rut: '22.222.222-2'
            });
            console.log('✅ Teacher created');
        }

        console.log('\n=== CREDENTIALS ===');
        console.log(`Colegio: ${tenant.name}`);
        console.log(`Sostenedor: ${sostenedorEmail} / ${password}`);
        console.log(`Profesor: ${teacherEmail} / ${password}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

setupFriendlySchool();
