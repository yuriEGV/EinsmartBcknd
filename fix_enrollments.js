
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

// Maritimo courses
const MARITIMO_COURSES = {
    '3E': '69aea7856d90fe1ea022d56e',  // 3° MedioE
    '3I': '69aea78f6d90fe1ea022d654',  // 3° MedioI
    '4E': '69aea78b6d90fe1ea022d5ea',  // 4° Medio E
    '4I': '69b00decd9a865783bebca5b',  // 4° Medio I
};

async function fixMaritivoEnrollments() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const MARITIMO_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');
    
    // Get all students from Maritimo - check actual field names
    const students = await db.collection('estudiantes').find({ tenantId: MARITIMO_ID }).toArray();
    console.log(`Found ${students.length} Maritimo students`);
    
    // Print all fields of first student
    if (students.length > 0) {
        console.log('Student fields:', Object.keys(students[0]));
        console.log('First student:', JSON.stringify(students[0], null, 2));
    }
    
    // Get existing enrollments for maritimo
    const existingEnrs = await db.collection('enrollments').find({ tenantId: MARITIMO_ID }).toArray();
    console.log(`\nExisting Maritimo enrollments: ${existingEnrs.length}`);
    
    // Check enrollment fields
    if (existingEnrs.length > 0) {
        console.log('Enrollment fields:', Object.keys(existingEnrs[0]));
        console.log('First enrollment:', JSON.stringify(existingEnrs[0], null, 2));
    }
    
    // Check which course IDs are in the enrollments
    const enrCourseIds = [...new Set(existingEnrs.map(e => String(e.courseId)))];
    console.log('\nEnrollment courseIds:', enrCourseIds);
    
    const validCourseIds = Object.values(MARITIMO_COURSES);
    const orphanCourseIds = enrCourseIds.filter(id => !validCourseIds.includes(id));
    console.log('Orphan (invalid) courseIds in enrollments:', orphanCourseIds);
    
    await mongoose.disconnect();
}

fixMaritivoEnrollments().catch(console.error);
