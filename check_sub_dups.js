
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function checkSpecificCourseSubjects() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find course '4° Medio E'
    const course = await db.collection('courses').findOne({ name: '4° Medio E' });
    if (!course) {
        console.log("Course not found!");
        await mongoose.disconnect();
        return;
    }
    
    console.log(`Course Found: ${course.name} (${course._id})`);
    
    const subjects = await db.collection('subjects').find({ courseId: course._id }).toArray();
    console.log(`\nFound ${subjects.length} subjects for this course:`);
    
    subjects.forEach(s => {
        console.log(` - ID: ${s._id}, Name: "${s.name}", Teacher: ${s.teacherId}`);
    });
    
    // Check duplicates again with different grouping
    const byName = {};
    subjects.forEach(s => {
        const n = s.name.trim().toLowerCase();
        if (!byName[n]) byName[n] = [];
        byName[n].push(s);
    });
    
    console.log('\nDuplicates analysis:');
    for (const [name, list] of Object.entries(byName)) {
        if (list.length > 1) {
            console.log(`DUPLICATE FOUND: "${name}" has ${list.length} entries`);
        }
    }
    
    await mongoose.disconnect();
}

checkSpecificCourseSubjects().catch(console.error);
