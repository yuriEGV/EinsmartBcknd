
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function analyzeEnrollments() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Get all courses
    const courses = await db.collection('courses').find({}).toArray();
    
    // Find Maritimo tenant
    const maritimo = courses.find(c => c.name?.includes('Medio'));
    
    // Get enrollments with course info
    const enrollments = await db.collection('enrollments').find({}).limit(20).toArray();
    console.log('\n=== ENROLLMENT COURSE IDs (first 20) ===');
    
    // Get unique courseIds from enrollments
    const enrollmentCourseIds = [...new Set(enrollments.map(e => String(e.courseId)))];
    console.log('Enrollment courseIds:', enrollmentCourseIds);
    
    // Check which of these match actual courses
    for (const eid of enrollmentCourseIds) {
        const course = courses.find(c => String(c._id) === eid);
        console.log(`  ${eid} -> ${course ? course.name : 'NO COURSE FOUND'}`);
    }
    
    // Get all Maritimo courses (the current ones)
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log('\n=== TENANTS ===');
    tenants.forEach(t => console.log(`  ${t._id}: ${t.name}`));
    
    // Get courses for each tenant
    const allCourses = await db.collection('courses').find({}).toArray();
    console.log('\n=== ALL COURSES BY TENANT ===');
    const byTenant = {};
    for (const c of allCourses) {
        const tid = String(c.tenantId);
        if (!byTenant[tid]) byTenant[tid] = [];
        const enrCount = await db.collection('enrollments').countDocuments({ courseId: c._id });
        byTenant[tid].push({ name: c.name, id: c._id, enrollments: enrCount });
    }
    for (const [tid, cs] of Object.entries(byTenant)) {
        const tenant = tenants.find(t => String(t._id) === tid);
        console.log(`\nTenant: ${tenant?.name || tid}`);
        cs.forEach(c => console.log(`  [${c.enrollments} enr] "${c.name}" (${c.id})`));
    }
    
    await mongoose.disconnect();
}

analyzeEnrollments().catch(console.error);
