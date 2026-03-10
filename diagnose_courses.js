
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function diagnose() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // 1. Check duplicate subjects
    const subjects = await db.collection('subjects').aggregate([
        { $group: { 
            _id: { name: '$name', courseId: '$courseId', tenantId: '$tenantId' }, 
            count: { $sum: 1 },
            ids: { $push: '$_id' }
        }},
        { $match: { count: { $gt: 1 } }},
        { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`DUPLICATE SUBJECTS (${subjects.length} groups):`);
    subjects.slice(0, 10).forEach(s => console.log(`  "${s._id.name}" in course ${s._id.courseId}: ${s.count} duplicates`));
    
    // 2. Check enrollments
    const enrollmentCount = await db.collection('enrollments').countDocuments();
    const studentCount = await db.collection('estudiantes').countDocuments();
    console.log(`\nSTUDENTS: ${studentCount}`);
    console.log(`ENROLLMENTS: ${enrollmentCount}`);
    
    // 3. Sample enrollments to see their status
    const sampleEnrollments = await db.collection('enrollments').find({}).limit(5).toArray();
    console.log('\nSAMPLE ENROLLMENT STATUSES:');
    sampleEnrollments.forEach(e => console.log(`  status: "${e.status}", courseId: ${e.courseId}`));
    
    // 4. Check courses
    const courses = await db.collection('courses').find({}).toArray();
    console.log('\nCOURSES:');
    for (const c of courses) {
        const enrCount = await db.collection('enrollments').countDocuments({ courseId: c._id });
        console.log(`  "${c.name}" - enrollments: ${enrCount}`);
    }
    
    await mongoose.disconnect();
}

diagnose().catch(console.error);
