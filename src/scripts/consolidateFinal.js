import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';
import Subject from '../models/subjectModel.js';
import Estudiante from '../models/estudianteModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Course from '../models/courseModel.js';
import Tenant from '../models/tenantModel.js';

const consolidateFinal = async () => {
    try {
        await connectDB();

        // Official Tenant (the one Carlos uses)
        const officialTenantId = new mongoose.Types.ObjectId('69c849cf241c8833989ba626');

        // Potential Old IDs
        const oldIds = [
            '6970c2ce06bbd688fd6d626c',
            '6984af03b00f07fa72d2e1ea'
        ].map(id => new mongoose.Types.ObjectId(id));

        console.log(`Consolidating everything into ${officialTenantId}...`);

        // 1. Students
        const students = await Estudiante.updateMany({ tenantId: { $in: oldIds } }, { $set: { tenantId: officialTenantId } });
        console.log(`Moved ${students.modifiedCount} students.`);

        // 2. Enrollments
        const enrollments = await Enrollment.updateMany({ tenantId: { $in: oldIds } }, { $set: { tenantId: officialTenantId } });
        console.log(`Moved ${enrollments.modifiedCount} enrollments.`);

        // 3. Subjects
        const subjects = await Subject.updateMany({ tenantId: { $in: oldIds } }, { $set: { tenantId: officialTenantId } });
        console.log(`Moved ${subjects.modifiedCount} subjects.`);

        // 4. Courses
        const courses = await Course.updateMany({ tenantId: { $in: oldIds } }, { $set: { tenantId: officialTenantId } });
        console.log(`Moved ${courses.modifiedCount} courses.`);

        // 5. Merge Duplicate Courses by name in the official tenant
        const allCourses = await Course.find({ tenantId: officialTenantId });
        const seenCourses = new Map();
        for (const c of allCourses) {
            const norm = c.name.replace(/\s+/g, '').toLowerCase();
            if (seenCourses.has(norm)) {
                const target = seenCourses.get(norm);
                console.log(`Merging course ${c.name} (${c._id}) -> ${target.name} (${target._id})`);
                await Enrollment.updateMany({ courseId: c._id }, { $set: { courseId: target._id } });
                await Subject.updateMany({ courseId: c._id }, { $set: { courseId: target._id } });
                await Course.findByIdAndDelete(c._id);
            } else {
                seenCourses.set(norm, c);
            }
        }

        // 6. Delete Old Tenants
        await Tenant.deleteMany({ _id: { $in: oldIds } });
        console.log('Cleaned up old tenant records.');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

consolidateFinal();
