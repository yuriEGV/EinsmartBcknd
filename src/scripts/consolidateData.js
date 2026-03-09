import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Estudiante from '../models/estudianteModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Course from '../models/courseModel.js';
import Tenant from '../models/tenantModel.js';

const consolidateTenantData = async () => {
    try {
        await connectDB();

        // Official Tenant
        const officialTenantId = new mongoose.Types.ObjectId('69c849cf241c8833989ba626');
        const oldTenantId = new mongoose.Types.ObjectId('6970c2ce06bbd688fd6d626');

        console.log(`Consolidating data from Old Tenant (${oldTenantId}) to Official Tenant (${officialTenantId})`);

        // 1. Update Students
        const updatedStudents = await Estudiante.updateMany(
            { tenantId: oldTenantId },
            { $set: { tenantId: officialTenantId } }
        );
        console.log(`Updated ${updatedStudents.modifiedCount} students.`);

        // 2. Update Enrollments
        const updatedEnrollments = await Enrollment.updateMany(
            { tenantId: oldTenantId },
            { $set: { tenantId: officialTenantId } }
        );
        console.log(`Updated ${updatedEnrollments.modifiedCount} enrollments.`);

        // 3. Update Subjects
        const updatedSubjects = await Subject.updateMany(
            { tenantId: oldTenantId },
            { $set: { tenantId: officialTenantId } }
        );
        console.log(`Updated ${updatedSubjects.modifiedCount} subjects.`);

        // 4. Merge Duplicate Courses
        // Find all courses in both tenants
        const courses = await Course.find({ tenantId: { $in: [officialTenantId, oldTenantId] } });
        console.log(`Analyzing ${courses.length} courses...`);

        for (const c of courses) {
            // Ensure course belongs to official tenant
            if (c.tenantId.toString() !== officialTenantId.toString()) {
                // Find matching course in official tenant
                const normalizedName = c.name.replace(/\s+/g, '').toLowerCase();
                const match = courses.find(oc =>
                    oc.tenantId.toString() === officialTenantId.toString() &&
                    oc.name.replace(/\s+/g, '').toLowerCase() === normalizedName
                );

                if (match) {
                    console.log(`Merging ${c.name} (${c._id}) into ${match.name} (${match._id})`);
                    // Move enrollments
                    await Enrollment.updateMany({ courseId: c._id }, { $set: { courseId: match._id } });
                    // Move subjects
                    await Subject.updateMany({ courseId: c._id }, { $set: { courseId: match._id } });
                    // Delete old course
                    await Course.findByIdAndDelete(c._id);
                } else {
                    // Just move the course to official tenant
                    console.log(`Moving course ${c.name} (${c._id}) to official tenant.`);
                    c.tenantId = officialTenantId;
                    await c.save();
                }
            }
        }

        // 5. Final Subject split check (ensure everything is split as requested)
        const ciencias = await Subject.find({
            tenantId: officialTenantId,
            name: { $regex: /Ciencias para la Ciudadanía/i }
        });

        const teacher = await User.findOne({ name: /Carlos Flores/i, tenantId: officialTenantId });

        for (const s of ciencias) {
            const newNames = ['Biología', 'Física', 'Química'];
            for (const name of newNames) {
                try {
                    await Subject.create({
                        tenantId: officialTenantId,
                        name,
                        courseId: s.courseId,
                        teacherId: teacher?._id || s.teacherId,
                        description: `Módulo de ${name} (ex Ciencias para la Ciudadanía)`
                    });
                } catch (e) {
                    // Duplicate index is expected if already split
                }
            }
            await Subject.findByIdAndDelete(s._id);
        }

        // 6. Delete Old Tenant
        await Tenant.findByIdAndDelete(oldTenantId);
        console.log('Deleted old tenant record.');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

consolidateTenantData();
