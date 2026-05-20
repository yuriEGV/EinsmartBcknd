const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart";

async function checkAdmin() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ $or: [{ email: /yuri/i }, { name: /yuri/i }] }).toArray();
    console.log("Found users matching yuri:", JSON.stringify(users, null, 2));
    
    // Also check how many tenants we have
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`\nFound ${tenants.length} tenants.`);
    tenants.forEach(t => console.log(`- ${t.name} (ID: ${t._id})`));

    mongoose.disconnect();
}

checkAdmin().catch(console.error);
