
import mongoose from 'mongoose';

const uri = "mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=einsmart";

const ORPHAN_IDS = [
  '69aaf20a9e4e1aced5d7b8b5',
  '69ab13ed8c1dbfcebd9017c4',
  '69ab14039369600f69b7ef5f',
  '69ab14b5d5704d4e64c9a6e0',
  '69ab151d4f5c1f93f18f5bdc',
  '69ab15693869fd2ff9c2e0e0',
  '69ab157c3869fd2ff9c2e28a',
  '69ab15873869fd2ff9c2e38e',
  '69aea78f6d90fe1ea022d6cc',
  '69aea7956d90fe1ea022d6cf',
  '69aea77c6d90fe1ea022d6c1',
  '69aea7856d90fe1ea022d6c7'
];

async function recoverNames() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('Searching for orphan IDs in other collections...');
    
    for (const id of ORPHAN_IDS) {
        const objId = new mongoose.Types.ObjectId(id);
        
        // Search in subjects
        const subject = await db.collection('subjects').findOne({ courseId: objId });
        if (subject) {
            console.log(`ID ${id} found in subjects! Example subject: ${subject.name}`);
        }
        
        // Search in attendance
        const attendance = await db.collection('attendances').findOne({ courseId: objId });
        if (attendance) {
            console.log(`ID ${id} found in attendances!`);
        }
    }
    
    // Maybe look at the students themselves?
    const studentsWithOrphans = await db.collection('estudiantes').find({ courseId: { $in: ORPHAN_IDS.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
    console.log(`\nStudents with orphan courseId in document: ${studentsWithOrphans.length}`);
    
    // Wait, the enrollment has the mapping student -> dead course.
    // If I can find the student's level/grade from some other field...
    
    await mongoose.disconnect();
}

recoverNames().catch(console.error);
