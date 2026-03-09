
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testConn() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        console.log('✅ Connected');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

testConn();
