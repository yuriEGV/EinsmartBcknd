
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;

async function explore() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log('ALL COLLECTIONS:');
    for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  ${col.name}: ${count} documents`);
    }
    
    // Try to find tenants
    const tenants = await db.collection('tenants').find({}).limit(5).toArray();
    if (tenants.length > 0) {
        console.log('\nTENANTS FOUND:');
        tenants.forEach(t => console.log(`  Name: "${t.name}", ID: ${t._id}`));
    } else {
        // Maybe the collection is named differently
        console.log('\nNo documents in "tenants" collection, trying others...');
    }
    
    // Also check courses count
    const subjects = await db.collection('subjects').find({}).limit(5).toArray();
    console.log('\nSAMPLE SUBJECTS:');
    subjects.forEach(s => console.log(`  name: "${s.name}", courseId: ${s.courseId}, tenantId: ${s.tenantId}`));
    
    await mongoose.disconnect();
}

explore().catch(console.error);
