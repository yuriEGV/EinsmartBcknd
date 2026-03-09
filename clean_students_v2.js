
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/einsmart';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Estudiante = (await import('./src/models/estudianteModel.js')).default;
    const Course = (await import('./src/models/courseModel.js')).default;
    const Enrollment = (await import('./src/models/enrollmentModel.js')).default;
    const Tenant = (await import('./src/models/tenantModel.js')).default;

    const tenant = await Tenant.findOne({ name: /Maritimo/i }) || await Tenant.findOne();
    if (!tenant) {
        console.error('No tenant found!');
        process.exit(1);
    }
    const tenantId = tenant._id;

    const data = JSON.parse(fs.readFileSync('./students_data.json', 'utf8'));

    // Get all valid student names from JSON
    const validNames = [];
    for (const curso in data) {
        data[curso].forEach(s => validNames.push(s.name.trim().toUpperCase()));
    }

    console.log(`Total valid students in JSON: ${validNames.length}`);

    // Delete students NOT in the list
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

    // Helper for email
    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    // Map course tags to real courses
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
            $or: [
                { name: courseInfo.name, letter: courseInfo.letter },
                { name: new RegExp(courseInfo.name, 'i'), letter: courseInfo.letter }
            ]
        });

        if (!course) {
            console.log(`Course ${tag} not found, creating...`);
            course = new Course({
                tenantId,
                name: courseInfo.name,
                letter: courseInfo.letter,
                level: tag.startsWith('3') ? '3' : '4',
                section: 'Formación General'
            });
            await course.save();
        }

        for (const sData of data[tag]) {
            const parts = sData.name.split(',');
            const apellidos = parts[0].trim();
            const nombres = parts[1].trim();
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
                    rut: sData.id, // Using the ID as RUT if not provided
                    genero: 'Otro',
                    fechaNacimiento: new Date('2008-01-01')
                });
            } else {
                student.email = email;
                student.rut = sData.id;
            }
            await student.save();

            // Ensure enrollment
            let enrollment = await Enrollment.findOne({ tenantId, estudianteId: student._id, courseId: course._id });
            if (!enrollment) {
                // Remove other enrollments if any to keep it clean
                await Enrollment.deleteMany({ tenantId, estudianteId: student._id });
                enrollment = new Enrollment({
                    tenantId,
                    estudianteId: student._id,
                    courseId: course._id,
                    year: 2026,
                    status: 'inscrito'
                });
                await enrollment.save();
            }
        }
    }

    console.log('Student cleanup and update finished');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
