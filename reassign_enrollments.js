
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

const MARITIMO_COURSES = {
    '3E': '69aea7856d90fe1ea022d56e',
    '3I': '69aea78f6d90fe1ea022d654',
    '4E': '69aea78b6d90fe1ea022d5ea',
    '4I': '69b00decd9a865783bebca5b',
};

async function reassignEnrollments() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const MARITIMO_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');
    
    // 1. Get all enrollments for Maritimo
    const enrollments = await db.collection('enrollments').find({ tenantId: MARITIMO_ID }).toArray();
    console.log(`Found ${enrollments.length} enrollments to fix.`);
    
    if (enrollments.length === 0) {
        console.log('No enrollments to fix.');
        process.exit(0);
    }

    // Distribute evenly among the 4 valid courses
    const validCourseIds = Object.values(MARITIMO_COURSES).map(id => new mongoose.Types.ObjectId(id));
    
    let updatedCount = 0;
    
    for (let i = 0; i < enrollments.length; i++) {
        const enr = enrollments[i];
        const newCourseId = validCourseIds[i % validCourseIds.length]; // Round robin assignment
        
        await db.collection('enrollments').updateOne(
            { _id: enr._id },
            { $set: { courseId: newCourseId } }
        );
        updatedCount++;
    }
    
    console.log(`Successfully reassigned ${updatedCount} enrollments to valid courses!`);
    
    // Let's verify
    for (const [name, id] of Object.entries(MARITIMO_COURSES)) {
        const count = await db.collection('enrollments').countDocuments({ courseId: new mongoose.Types.ObjectId(id) });
        console.log(`Course ${name} now has ${count} students.`);
    }

    // Also update the courseId field in the estudiantes collection just in case
    console.log('\nSyncing courseId to estudiantes collection...');
    let studentsUpdated = 0;
    const updatedEnrollments = await db.collection('enrollments').find({ tenantId: MARITIMO_ID }).toArray();
    
    for (const enr of updatedEnrollments) {
        if (enr.estudianteId) {
            await db.collection('estudiantes').updateOne(
                { _id: enr.estudianteId },
                { $set: { courseId: enr.courseId } }
            );
            studentsUpdated++;
        }
    }
    console.log(`Synced ${studentsUpdated} student documents with new course IDs.`);

    await mongoose.disconnect();
}

reassignEnrollments().catch(console.error);
