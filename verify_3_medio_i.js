import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');
        const { default: User } = await import('./src/models/userModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
        const course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('3.*?Medio', 'i'),
            letter: 'I'
        });

        const teacher = await User.findById(course.teacherId);
        console.log(`Course: ${course.name} ${course.letter}`);
        console.log(`Teacher: ${teacher ? teacher.name : 'None!'}`);

        const count = await Enrollment.countDocuments({ courseId: course._id });
        console.log(`Enrollments Count: ${count}`);

        if (count === 30) {
            console.log('✅ VERIFICATION PASSED');
        } else {
            console.log('❌ VERIFICATION FAILED');
        }

    } catch(e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
verify();
