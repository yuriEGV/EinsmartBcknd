
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

async function cleanupSubjects() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const MARITIMO_ID = new mongoose.Types.ObjectId('6984af03b00f020e9834b948');
    
    // 1. Find all subjects for Maritimo
    const subjects = await db.collection('subjects').find({ tenantId: MARITIMO_ID }).toArray();
    console.log(`Total subjects in Maritimo: ${subjects.length}`);
    
    // Group by courseId and name to find duplicates
    const groups = {};
    subjects.forEach(s => {
        const key = `${s.courseId}_${s.name.trim()}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    
    let deletedCount = 0;
    for (const [key, group] of Object.entries(groups)) {
        if (group.length > 1) {
            console.log(`Found ${group.length} entries for subject "${group[0].name}" in course ${group[0].courseId}`);
            // Keep the first one, delete the rest
            for (let i = 1; i < group.length; i++) {
                await db.collection('subjects').deleteOne({ _id: group[i]._id });
                deletedCount++;
            }
        }
    }
    
    console.log(`\nCleanup complete. Deleted ${deletedCount} duplicate subjects.`);
    
    await mongoose.disconnect();
}

cleanupSubjects().catch(console.error);
