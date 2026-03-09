
import mongoose from 'mongoose';
import fs from 'fs';

const MONGO_URI = 'mongodb+srv://yguajardov:maquina123@comercioelectronico.c6vj7t7.mongodb.net/Einsmart?appName=Einsmart';

async function run() {
    console.log('Attempting to connect to Atlas...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Successfully connected to MongoDB Atlas');

        const { default: Estudiante } = await import('./src/models/estudianteModel.js');
        const { default: Course } = await import('./src/models/courseModel.js');
        const { default: Enrollment } = await import('./src/models/enrollmentModel.js');
        const { default: Tenant } = await import('./src/models/tenantModel.js');
        const { default: User } = await import('./src/models/userModel.js');

        const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
        if (!tenant) {
            console.error('No tenant found!');
            process.exit(1);
        }
        const tenantId = tenant._id;
        console.log('Using tenant:', tenant.name, 'ID:', tenantId);

        // Find a teacher to assign to new courses if needed
        const teacher = await User.findOne({ tenantId, role: 'teacher' }) || await User.findOne({ tenantId, role: 'admin' });
        if (!teacher) {
            console.error('No teacher/admin found to assign to courses!');
            process.exit(1);
        }
        console.log('Using teacher for new courses:', teacher.name);

        const data = JSON.parse(fs.readFileSync('./students_data.json', 'utf8'));

        const validNames = [];
        for (const curso in data) {
            data[curso].forEach(s => validNames.push(s.name.trim().toUpperCase()));
        }

        const allStudents = await Estudiante.find({ tenantId });
        let deletedCount = 0;
        for (const student of allStudents) {
            const fullName = `${student.apellidos}, ${student.nombres}`.trim().toUpperCase();
            if (!validNames.includes(fullName)) {
                await Estudiante.deleteOne({ _id: student._id });
                await Enrollment.deleteMany({ estudianteId: student._id });
                deletedCount++;
            }
        }
        console.log(`Deleted ${deletedCount} invalid students`);

        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        const courseMap = {
            "3E": { name: "3º Medio", letter: "E" },
            "4E": { name: "4º Medio", letter: "E" },
            "3I": { name: "3º Medio", letter: "I" },
            "4I": { name: "4º Medio", letter: "I" }
        };

        for (const tag in data) {
            const courseInfo = courseMap[tag];
            let course = await Course.findOne({
                tenantId,
                name: new RegExp(courseInfo.name, 'i'),
                letter: courseInfo.letter
            });

            if (!course) {
                console.log(`Course ${tag} (${courseInfo.name} ${courseInfo.letter}) not found, creating...`);
                course = new Course({
                    tenantId,
                    name: courseInfo.name,
                    letter: courseInfo.letter,
                    level: tag.startsWith('3') ? '3' : '4',
                    teacherId: teacher._id
                });
                await course.save();
            }

            for (const sData of data[tag]) {
                const parts = sData.name.split(',');
                const apellidos = (parts[0] || '').trim();
                const nombres = (parts[1] || '').trim();
                if (!nombres || !apellidos) continue;

                const firstName = nombres.split(' ')[0];
                const lastName = apellidos.split(' ')[0];
                const email = `${normalize(firstName)}.${normalize(lastName)}@imaritimo.cl`;

                let student = await Estudiante.findOne({ tenantId, nombres, apellidos });
                if (!student) {
                    student = new Estudiante({
                        tenantId,
                        nombres,
                        apellidos,
                        email,
                        rut: sData.id,
                        genero: 'No informado'
                    });
                } else {
                    student.email = email;
                    student.rut = sData.id;
                }
                await student.save();

                let enrollment = await Enrollment.findOne({ tenantId, estudianteId: student._id, courseId: course._id });
                if (!enrollment) {
                    await Enrollment.deleteMany({ tenantId, estudianteId: student._id });
                    enrollment = new Enrollment({
                        tenantId,
                        estudianteId: student._id,
                        courseId: course._id,
                        period: '2026',
                        status: 'inscrito'
                    });
                    await enrollment.save();
                }
            }
        }

        console.log('Student cleanup and update finished successfully');
        process.exit(0);
    } catch (error) {
        console.error('An error occurred:', error);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
        process.exit(1);
    }
}

run();
