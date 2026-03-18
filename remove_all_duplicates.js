import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function removeDuplicates() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const { default: Estudiante } = await import('./src/models/estudianteModel.js');
        const { default: User } = await import('./src/models/userModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');

        // 1. Deduplicate Users by Email
        const usersByEmail = await User.aggregate([
            { $group: { _id: "$email", count: { $sum: 1 }, users: { $push: "$$ROOT" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let deletedUsers = 0;
        for (const group of usersByEmail) {
            // Sort to keep the one with most info or most recently updated
            const sortedUsers = group.users.sort((a, b) => b.updatedAt - a.updatedAt);
            const keepUser = sortedUsers.find(u => u.rut) || sortedUsers[0]; // Prefer the one with RUT
            
            for (const user of sortedUsers) {
                if (user._id.toString() !== keepUser._id.toString()) {
                    await User.deleteOne({ _id: user._id });
                    deletedUsers++;
                }
            }
        }
        console.log(`🗑️  Removed ${deletedUsers} duplicate users by email.`);

        // 1.1 Deduplicate Users by RUT (if any)
        const usersByRut = await User.aggregate([
            { $match: { rut: { $exists: true, $ne: null, $ne: "" } } },
            { $group: { _id: "$rut", count: { $sum: 1 }, users: { $push: "$$ROOT" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let deletedUsersRut = 0;
        for (const group of usersByRut) {
            const sortedUsers = group.users.sort((a, b) => b.updatedAt - a.updatedAt);
            const keepUser = sortedUsers[0];
            
            for (const user of sortedUsers) {
                if (user._id.toString() !== keepUser._id.toString()) {
                    await User.deleteOne({ _id: user._id });
                    deletedUsersRut++;
                }
            }
        }
        console.log(`🗑️  Removed ${deletedUsersRut} duplicate users by RUT.`);

        // 2. Deduplicate Estudiantes by RUT
        const estudiantesByRut = await Estudiante.aggregate([
            { $match: { rut: { $exists: true, $ne: null, $ne: "" } } },
            { $group: { _id: "$rut", count: { $sum: 1 }, students: { $push: "$$ROOT" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let deletedStudents = 0;
        for (const group of estudiantesByRut) {
            const sortedStudents = group.students.sort((a, b) => b.updatedAt - a.updatedAt);
            const keepStudent = sortedStudents.find(s => s.email && s.email.includes('@')) || sortedStudents[0];
            
            for (const student of sortedStudents) {
                if (student._id.toString() !== keepStudent._id.toString()) {
                    await Estudiante.deleteOne({ _id: student._id });
                    await Enrollment.deleteMany({ estudianteId: student._id }); // cleanup enrollments for deleted student
                    deletedStudents++;
                }
            }
        }
        console.log(`🗑️  Removed ${deletedStudents} duplicate students by RUT.`);

        // 3. Deduplicate Enrollments by tenantId + courseId + estudianteId + period
        const enrollmentsGrouped = await Enrollment.aggregate([
            { $group: { 
                _id: { tenantId: "$tenantId", courseId: "$courseId", estudianteId: "$estudianteId", period: "$period" }, 
                count: { $sum: 1 }, 
                enrollments: { $push: "$$ROOT" } 
            }},
            { $match: { count: { $gt: 1 } } }
        ]);

        let deletedEnrollments = 0;
        for (const group of enrollmentsGrouped) {
            const sortedEnrollments = group.enrollments.sort((a, b) => b.updatedAt - a.updatedAt);
            const keepEnrollment = sortedEnrollments[0];
            
            for (const enrollment of sortedEnrollments) {
                if (enrollment._id.toString() !== keepEnrollment._id.toString()) {
                    await Enrollment.deleteOne({ _id: enrollment._id });
                    deletedEnrollments++;
                }
            }
        }
        console.log(`🗑️  Removed ${deletedEnrollments} duplicate enrollments.`);

        console.log('✅ Deduplication complete.');
    } catch (error) {
        console.error('❌ Error during deduplication:', error);
    } finally {
        await mongoose.disconnect();
    }
}

removeDuplicates();
