import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        const { default: User } = await import('./src/models/userModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
        
        const course = await Course.findOne({
            tenantId: tenant._id,
            name: new RegExp('4.*?Medio', 'i'),
            letter: 'E'
        });

        if (!course) {
            console.error('Course not found');
            process.exit(1);
        }

        const teacher = await User.findById(course.teacherId);
        
        console.log(`Course: ${course.name} ${course.letter}`);
        console.log(`Teacher: ${teacher ? teacher.name : 'None'}`);

        const enrollments = await Enrollment.find({
            tenantId: tenant._id,
            courseId: course._id
        });

        console.log(`Enrollments Count: ${enrollments.length}`);
        
        if (enrollments.length === 26 && teacher && teacher.name.toLowerCase().includes('erwin')) {
            console.log('✅ VERIFICATION PASSED');
        } else {
            console.log('❌ VERIFICATION FAILED');
            process.exit(1);
        }

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
