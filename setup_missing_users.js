
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/userModel.js';
import Tenant from './src/models/tenantModel.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

const setupMissingUsers = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const tenants = await Tenant.find();
        const password = '123456';
        const passwordHash = await bcrypt.hash(password, 10);

        console.log(`Found ${tenants.length} tenants. Processing...`);

        const credentialsList = [];

        for (const tenant of tenants) {
            const domain = tenant.domain || tenant.name.toLowerCase().replace(/\s+/g, '') + '.cl';
            const cleanName = tenant.name.replace(/\s+/g, '');

            // 1. Sostenedor
            const sosEmail = `sostenedor@${domain}`;
            let sostenedor = await User.findOne({ email: sosEmail });
            if (!sostenedor) {
                sostenedor = await User.create({
                    name: `Sostenedor ${tenant.name}`,
                    email: sosEmail,
                    passwordHash,
                    role: 'sostenedor',
                    tenantId: tenant._id,
                    rut: `99.999.999-${Math.floor(Math.random() * 9)}` // Random RUT
                });
                console.log(`[NEW] Created Sostenedor for ${tenant.name}`);
            } else {
                // Ensure password and role
                sostenedor.passwordHash = passwordHash;
                sostenedor.role = 'sostenedor';
                await sostenedor.save();
                console.log(`[UPD] Updated Sostenedor for ${tenant.name}`);
            }

            // 2. Teacher
            const profEmail = `profe@${domain}`;
            let teacher = await User.findOne({ email: profEmail });
            if (!teacher) {
                teacher = await User.create({
                    name: `Profe ${tenant.name}`,
                    email: profEmail,
                    passwordHash,
                    role: 'teacher',
                    tenantId: tenant._id,
                    rut: `88.888.888-${Math.floor(Math.random() * 9)}`
                });
                console.log(`[NEW] Created Teacher for ${tenant.name}`);
            } else {
                teacher.passwordHash = passwordHash;
                teacher.role = 'teacher';
                await teacher.save();
                console.log(`[UPD] Updated Teacher for ${tenant.name}`);
            }

            credentialsList.push({
                school: tenant.name,
                sostenedor: sosEmail,
                teacher: profEmail
            });
        }

        console.log('\n=== 🔐 LISTA DE CREDENCIALES (Password: 123456) ===');
        credentialsList.forEach(cred => {
            console.log(`\n🏫 ${cred.school}`);
            console.log(`   👤 Sostenedor: ${cred.sostenedor}`);
            console.log(`   🍎 Profesor:   ${cred.teacher}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

setupMissingUsers();
