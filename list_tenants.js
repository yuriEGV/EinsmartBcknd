
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;

async function findTenants() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log('ALL TENANTS:');
    tenants.forEach(t => console.log(`  ID: ${t._id}, Name: "${t.name}", Slug: "${t.slug}"`));
    await mongoose.disconnect();
}

findTenants().catch(console.error);
