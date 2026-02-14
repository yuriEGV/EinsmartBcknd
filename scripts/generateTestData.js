
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Models
import Tenant from '../src/models/tenantModel.js';
import User from '../src/models/userModel.js';
import Course from '../src/models/courseModel.js';
import Subject from '../src/models/subjectModel.js';
import Estudiante from '../src/models/estudianteModel.js';
import Enrollment from '../src/models/enrollmentModel.js';
import Evaluation from '../src/models/evaluationModel.js';
import Grade from '../src/models/gradeModel.js';
import Rubric from '../src/models/rubricModel.js';
import Apoderado from '../src/models/apoderadoModel.js';
import Tariff from '../src/models/tariffModel.js';

// Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env');
    process.exit(1);
}

const generateData = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Create Tenant
        const tenantName = `Colegio Demo ${new Date().getTime()}`;
        const tenant = await Tenant.create({
            name: tenantName,
            domain: `demo-${new Date().getTime()}.einsmart.com`,
            paymentType: 'paid',
            academicYear: new Date().getFullYear().toString()
        });
        console.log(`✅ Tenant created: ${tenant.name} (${tenant._id})`);

        // 2. Create Users (Director & Teachers)
        const passwordHash = await bcrypt.hash('123456', 10);

        const director = await User.create({
            tenantId: tenant._id,
            name: 'Director Demo',
            email: `director.${tenant._id}@test.com`,
            passwordHash,
            role: 'director',
            rut: `10.000.000-${Math.floor(Math.random() * 9)}`
        });
        console.log(`✅ Director created: ${director.email} / 123456`);

        const teacher1 = await User.create({
            tenantId: tenant._id,
            name: 'Profesor Uno',
            email: `profesor1.${tenant._id}@test.com`,
            passwordHash,
            role: 'teacher',
            rut: `11.000.111-${Math.floor(Math.random() * 9)}`
        });
        const teacher2 = await User.create({
            tenantId: tenant._id,
            name: 'Profesor Dos',
            email: `profesor2.${tenant._id}@test.com`,
            passwordHash,
            role: 'teacher',
            rut: `12.000.222-${Math.floor(Math.random() * 9)}`
        });
        console.log(`✅ Teachers created: ${teacher1.email} & ${teacher2.email}`);

        // 3. Create Courses
        const course1 = await Course.create({
            tenantId: tenant._id,
            name: '1° Básico A',
            level: '1° Básico',
            letter: 'A',
            teacherId: teacher1._id
        });
        const course2 = await Course.create({
            tenantId: tenant._id,
            name: '2° Básico B',
            level: '2° Básico',
            letter: 'B',
            teacherId: teacher2._id
        });
        console.log(`✅ Courses created: ${course1.name} & ${course2.name}`);

        // 4. Create Subjects
        const subjectsData = [
            { name: 'Matemáticas', courseId: course1._id, teacherId: teacher1._id },
            { name: 'Lenguaje', courseId: course1._id, teacherId: teacher2._id }, // Cross teaching
            { name: 'Historia', courseId: course2._id, teacherId: teacher2._id },
            { name: 'Ciencias', courseId: course2._id, teacherId: teacher1._id }
        ];

        const subjects = [];
        for (const s of subjectsData) {
            const subject = await Subject.create({
                tenantId: tenant._id,
                ...s
            });
            subjects.push(subject);
        }
        console.log(`✅ ${subjects.length} Subjects created.`);

        // 5. Create Students & Enrollments
        const createStudentsForCourse = async (course, count) => {
            const students = [];
            for (let i = 1; i <= count; i++) {
                // Ensure 3 digits for the middle part by adding 100 or using padStart
                const middle = Math.floor(Math.random() * 900) + 100;
                const rutRandom = `${10 + i}.000.${middle}-${Math.floor(Math.random() * 9)}`;
                const student = await Estudiante.create({
                    tenantId: tenant._id,
                    nombres: `Estudiante ${i}`,
                    apellidos: `Del Curso ${course.letter}`,
                    rut: rutRandom,
                    email: `estudiante${i}.${course._id}@test.com`,
                    matricula: `MAT-${course.letter}-${i}-${Date.now()}`
                });

                // Create User login for student (optional but good for testing)
                // await User.create({
                //     tenantId: tenant._id,
                //     name: `${student.nombres} ${student.apellidos}`,
                //     email: student.email,
                //     passwordHash,
                //     role: 'student',
                //     profileId: student._id
                // });

                // Enroll
                await Enrollment.create({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    courseId: course._id,
                    period: tenant.academicYear,
                    status: 'confirmada'
                });

                // Create Guardian (Apoderado)
                const guardianRut = `${Math.floor(Math.random() * 10) + 10}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9)}`;
                const guardian = await Apoderado.create({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    nombre: `Apoderado ${i}`,
                    apellidos: `Del Estudiante ${i}`,
                    rut: guardianRut,
                    email: `apoderado${i}.${course._id}@test.com`,
                    tipo: 'principal',
                    parentesco: 'Padre/Madre',
                    telefono: '+56912345678'
                });

                // Create User login for Guardian
                await User.create({
                    tenantId: tenant._id,
                    name: `${guardian.nombre} ${guardian.apellidos}`,
                    email: `apoderado${i}.${course._id}@test.com`,
                    passwordHash,
                    role: 'apoderado',
                    profileId: guardian._id,
                    rut: guardianRut
                });

                students.push(student);
            }
            return students;
        };

        const studentsC1 = await createStudentsForCourse(course1, 10);
        const studentsC2 = await createStudentsForCourse(course2, 10);
        console.log(`✅ 20 Students, Enrollments, and Guardians created.`);

        // 6. Create Tariffs (Aranceles)
        const tariffs = [
            { name: 'Matrícula 2026', amount: 50000, description: 'Pago anual de matrícula' },
            { name: 'Mensualidad Marzo', amount: 150000, description: 'Mensualidad escolar' },
            { name: 'Mensualidad Abril', amount: 150000, description: 'Mensualidad escolar' },
            { name: 'Centro de Padres', amount: 20000, description: 'Cuota anual' }
        ];

        for (const t of tariffs) {
            await Tariff.create({
                tenantId: tenant._id,
                ...t
            });
        }
        console.log(`✅ ${tariffs.length} Tariffs created.`);

        // 7. Create Evaluations & Grades
        // For each subject, create 3 evaluations
        for (const subject of subjects) {
            // Determine enrolled students for this subject's course
            const enrolledStudents = subject.courseId.toString() === course1._id.toString() ? studentsC1 : studentsC2;

            for (let e = 1; e <= 3; e++) {
                const evalType = e === 3 ? 'sumativa' : 'formativa';
                const evaluation = await Evaluation.create({
                    tenantId: tenant._id,
                    courseId: subject.courseId,
                    subjectId: subject._id,
                    title: `Evaluación ${e} - ${subject.name}`,
                    type: evalType,
                    date: new Date(),
                    maxScore: 7.0
                });

                // Assign grades
                const gradePromises = enrolledStudents.map(student => {
                    // Random score between 2.0 and 7.0
                    const score = parseFloat((Math.random() * (7.0 - 2.0) + 2.0).toFixed(1));
                    return Grade.create({
                        tenantId: tenant._id,
                        evaluationId: evaluation._id,
                        estudianteId: student._id,
                        score
                    });
                });
                await Promise.all(gradePromises);
            }
        }
        console.log(`✅ Evaluations and Grades generated for all subjects.`);

        // 7. Create Rubric
        await Rubric.create({
            tenantId: tenant._id,
            teacherId: teacher1._id,
            title: 'Rúbrica de Presentación Oral',
            description: 'Evaluación de habilidades comunicativas',
            levels: [
                { name: 'Excelente', points: 4 },
                { name: 'Bueno', points: 3 },
                { name: 'Regular', points: 2 },
                { name: 'Insuficiente', points: 1 }
            ],
            criteria: [
                {
                    name: 'Claridad',
                    descriptors: [
                        { levelName: 'Excelente', text: 'Habla claramente todo el tiempo' },
                        { levelName: 'Bueno', text: 'Habla claramente la mayor parte del tiempo' },
                        { levelName: 'Regular', text: 'A veces es difícil de entender' },
                        { levelName: 'Insuficiente', text: 'No se entiende' }
                    ]
                },
                {
                    name: 'Contenido',
                    descriptors: [
                        { levelName: 'Excelente', text: 'Domina el tema completamente' },
                        { levelName: 'Bueno', text: 'Conoce bien el tema' },
                        { levelName: 'Regular', text: 'Tiene dudas sobre el tema' },
                        { levelName: 'Insuficiente', text: 'No conoce el tema' }
                    ]
                }
            ]
        });
        console.log(`✅ Sample Rubric created for Teacher 1.`);

        console.log('\n=============================================');
        console.log('🎉 DATA GENERATION COMPLETE');
        console.log('=============================================');
        console.log(`Tenant: ${tenant.name}`);
        console.log(`Director Login: ${director.email} / 123456`);
        console.log(`Teacher 1 Login: ${teacher1.email} / 123456`);
        console.log(`Teacher 2 Login: ${teacher2.email} / 123456`);
        console.log(`Sample Guardian Login: apoderado1.${course1._id}@test.com / 123456`);
        console.log('=============================================');

        process.exit(0);

    } catch (error) {
        console.error('❌ Data Generation Failed:', error);
        process.exit(1);
    }
};

generateData();
