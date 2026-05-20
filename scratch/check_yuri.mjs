import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart";

async function checkAdmin() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ $or: [{ email: /yuri/i }, { name: /yuri/i }, { role: 'superadmin' }, { role: 'fiscalizador' }] }).toArray();
    console.log("Found matching users:", JSON.stringify(users, null, 2));
    
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`\nFound ${tenants.length} tenants.`);
    tenants.forEach(t => console.log(`- ${t.name} (ID: ${t._id})`));

    mongoose.disconnect();
}

checkAdmin().catch(console.error);
