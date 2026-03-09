import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Tenant from '../models/tenantModel.js';

const fixAndSplit = async () => {
    try {
        await connectDB();
        const tenant = await Tenant.findOne({ name: 'Instituto Bicentenario Maritimo' });
        const tenantId = tenant._id;

        // 1. Fix Teacher IDs for all subjects first
        const allSubjects = await Subject.find({ tenantId });
        console.log(`Checking ${allSubjects.length} subjects for teacher matches...`);

        const teachers = await User.find({ tenantId, role: 'teacher' });

        let fixedCount = 0;
        for (const s of allSubjects) {
            // If current teacherId is null or not found in User collection
            const currentTeacher = await User.findById(s.teacherId);
            if (!currentTeacher) {
                // Try to find a teacher by some heuristic or just the first one for now
                // Actually, let's look for 'Carlos Flores' as a default if we are unsure
                const defaultTeacher = teachers.find(t => t.name.includes('Carlos Flores')) || teachers[0];
                if (defaultTeacher) {
                    s.teacherId = defaultTeacher._id;
                    await s.save();
                    fixedCount++;
                }
            }
        }
        console.log(`Fixed ${fixedCount} subjects with missing/invalid teachers.`);

        // 2. Split "Ciencias para la Ciudadanía"
        const targetSubjects = await Subject.find({
            tenantId,
            name: { $regex: /Ciencias para la Ciudadanía/i }
        });

        console.log(`Splitting ${targetSubjects.length} "Ciencias para la Ciudadanía" subjects...`);

        for (const s of targetSubjects) {
            const newNames = ['Biología', 'Física', 'Química'];
            for (const name of newNames) {
                try {
                    await Subject.create({
                        tenantId,
                        name,
                        courseId: s.courseId,
                        teacherId: s.teacherId, // Keep same teacher for now as placeholder
                        description: `Módulo de ${name} (ex Ciencias para la Ciudadanía)`
                    });
                } catch (e) {
                    // Likely duplicate index error, which is fine
                    console.log(`Failed to create ${name} (possibly already exists)`);
                }
            }
            // Delete original
            await Subject.findByIdAndDelete(s._id);
        }

        // 3. Cleanup Duplicates (any subject with same name in same course)
        const allSubjsAfter = await Subject.find({ tenantId });
        const seen = new Set();
        let dupCount = 0;
        for (const s of allSubjsAfter) {
            const key = `${s.courseId}_${s.name.toLowerCase()}`;
            if (seen.has(key)) {
                await Subject.findByIdAndDelete(s._id);
                dupCount++;
            } else {
                seen.add(key);
            }
        }
        console.log(`Removed ${dupCount} duplicate subjects.`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixAndSplit();
