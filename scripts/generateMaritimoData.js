
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
import Question from '../src/models/questionModel.js';
import Planning from '../src/models/planningModel.js';
import Objective from '../src/models/objectiveModel.js'; // Added Objective model

// Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env');
    process.exit(1);
}

const generateMaritimoData = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Find Existing Tenant
        const tenantName = "Instituto Bicentenario Maritimo"; // Matching the existing one
        let tenant = await Tenant.findOne({ name: tenantName });

        if (!tenant) {
            console.log(`⚠️ Tenant '${tenantName}' not found. Searching by ID...`);
            tenant = await Tenant.findById('6984af03b00f020e9834b948'); // Hardcoded ID from checkTenants.js
        }

        if (!tenant) {
            console.error(`❌ Tenant not found. Please create it first or check the name.`);
            process.exit(1);
        }

        console.log(`✅ Using Tenant: ${tenant.name} (ID: ${tenant._id})`);

        const passwordHash = await bcrypt.hash('123456', 10);

        // 2. Create Teachers & Careers
        // Specific careers requested: Química, Elaboración de Alimentos, Mecánica, Operaciones Portuarias, Gastronomía
        const teachersData = [
            { name: 'Prof. Química', email: 'profe.quimica', specialty: 'Química Industrial', rut: '15.111.111-1' },
            { name: 'Prof. Alimentos', email: 'profe.alimentos', specialty: 'Elaboración de Alimentos', rut: '16.222.222-2' },
            { name: 'Prof. Mecánica', email: 'profe.mecanica', specialty: 'Mecánica Automotriz', rut: '17.333.333-3' },
            { name: 'Prof. Puertos', email: 'profe.puertos', specialty: 'Operaciones Portuarias', rut: '18.444.444-4' },
            { name: 'Prof. Gastronomía', email: 'profe.gastro', specialty: 'Gastronomía', rut: '19.555.555-5' }
        ];

        const teachers = [];
        for (const t of teachersData) {
            const teacher = await User.create({
                tenantId: tenant._id,
                name: t.name,
                email: `${t.email}.${tenant._id}@maritimo.cl`, // Unique email per tenant
                passwordHash,
                role: 'teacher',
                rut: t.rut,
                specialization: t.specialty
            });
            teachers.push(teacher);
            console.log(`✅ Teacher created: ${teacher.name} (${teacher.specialization})`);
        }

        // 3. Create Courses (One for each specialty)
        const courses = [];
        for (let i = 0; i < teachers.length; i++) {
            const teacher = teachers[i];
            const letter = String.fromCharCode(65 + i); // A, B, C, D, E
            const course = await Course.create({
                tenantId: tenant._id,
                name: `3° Medio ${letter} - ${teacher.specialization}`,
                level: 'III° Medio',
                letter: letter,
                teacherId: teacher._id,
                description: `Especialidad de ${teacher.specialization}`
            });
            courses.push({ course, teacher });

            // Create Specialty Subject
            const subject = await Subject.create({
                tenantId: tenant._id,
                name: `Módulo: ${teacher.specialization}`,
                courseId: course._id,
                teacherId: teacher._id
            });
            courses[i].subject = subject;
        }
        console.log(`✅ ${courses.length} Courses and Specialty Subjects created.`);

        // 4. Create Students & Guardians
        for (const item of courses) {
            const { course, subject } = item;

            const students = [];
            for (let j = 1; j <= 5; j++) {
                const middle = Math.floor(Math.random() * 900) + 100;
                const rutRandom = `${20 + j}.000.${middle}-${Math.floor(Math.random() * 9)}`;

                const student = await Estudiante.create({
                    tenantId: tenant._id,
                    nombres: `Alumno ${j}`,
                    apellidos: `De ${course.letter}`,
                    rut: rutRandom,
                    email: `alumno${j}.${course._id}@maritimo.cl`,
                    matricula: `MAR-${course.letter}-${j}`
                });

                // User for Student
                await User.create({
                    tenantId: tenant._id,
                    name: `${student.nombres} ${student.apellidos}`,
                    email: student.email,
                    passwordHash,
                    role: 'student',
                    profileId: student._id,
                    rut: rutRandom
                });

                // Enroll
                await Enrollment.create({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    courseId: course._id,
                    period: '2026',
                    status: 'confirmada'
                });

                // Guardian
                const gRut = `${10 + j}.${middle}.${middle}-${Math.floor(Math.random() * 9)}`;
                const guardian = await Apoderado.create({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    nombre: `Apoderado ${j}`,
                    apellidos: `Del Alumno ${j}`,
                    rut: gRut,
                    correo: `apoderado${j}.${course._id}@maritimo.cl`,
                    tipo: 'principal',
                    parentesco: 'Padre/Madre',
                    telefono: '+56999999999'
                });

                // User for Guardian
                await User.create({
                    tenantId: tenant._id,
                    name: `${guardian.nombre} ${guardian.apellidos}`,
                    email: guardian.correo,
                    passwordHash,
                    role: 'apoderado',
                    profileId: guardian._id,
                    rut: gRut
                });

                students.push(student);
            }
            item.students = students;
        }
        console.log(`✅ Students and Guardians created for all courses.`);

        // 5. Create Progressive Rubrics linked to Planning
        // We will enable strict dates: March and April
        const planningDates = [
            new Date('2026-03-10'),
            new Date('2026-03-24'),
            new Date('2026-04-07'),
            new Date('2026-04-21')
        ];

        const difficulties = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];

        for (const item of courses) {
            const { course, subject, students, teacher } = item;

            for (let i = 0; i < 4; i++) {
                // A. Create Rubric first (to link to Planning)
                const rubric = await Rubric.create({
                    tenantId: tenant._id,
                    teacherId: teacher._id,
                    subjectId: subject._id,
                    title: `Rúbrica: ${difficulties[i]} - ${subject.name}`,
                    description: `Criterios de evaluación para nivel ${difficulties[i]}`,
                    levels: [
                        { name: 'Excelente', points: 4 },
                        { name: 'Bueno', points: 3 },
                        { name: 'Suficiente', points: 2 },
                        { name: 'Insuficiente', points: 1 }
                    ],
                    criteria: [
                        {
                            name: 'Conocimiento Teórico',
                            descriptors: [
                                { levelName: 'Excelente', text: 'Domina todos los conceptos' },
                                { levelName: 'Bueno', text: 'Domina la mayoría' },
                                { levelName: 'Suficiente', text: 'Domina lo básico' },
                                { levelName: 'Insuficiente', text: 'No domina conceptos' }
                            ]
                        },
                        {
                            name: 'Aplicación Práctica',
                            descriptors: [
                                { levelName: 'Excelente', text: 'Ejecuta sin errores' },
                                { levelName: 'Bueno', text: 'Ejecuta con errores menores' },
                                { levelName: 'Suficiente', text: 'Ejecuta con ayuda' },
                                { levelName: 'Insuficiente', text: 'No logra ejecutar' }
                            ]
                        }
                    ]
                });

                // B. Create Objectives (required for Planning)
                const createdObjectives = [];
                for (let k = 1; k <= 2; k++) {
                    const obj = await Objective.create({
                        tenantId: tenant._id,
                        subjectId: subject._id,
                        code: `OA ${k + (i * 2)}`, // OA 1, OA 2...
                        description: `Objetivo de Aprendizaje ${k} para nivel ${difficulties[i]}`,
                        active: true
                    });
                    createdObjectives.push(obj._id);
                }

                // C. Create Planning (Planificación) linked to Rubric & Objectives
                const planning = await Planning.create({
                    tenantId: tenant._id,
                    subjectId: subject._id,
                    teacherId: teacher._id,
                    unit: `Unidad ${i + 1}: Competencias ${difficulties[i]}`,
                    title: `Planificación Evaluación ${i + 1}`,
                    description: `Preparación y ejecución de la evaluación de nivel ${difficulties[i]}`,
                    startDate: new Date(planningDates[i].getTime() - 86400000 * 5), // 5 days before
                    endDate: planningDates[i],
                    status: 'approved', // So it's visible/active
                    rubricId: rubric._id,
                    objectives: createdObjectives, // Use real Objective IDs
                    activities: 'Clases teóricas y prácticas en taller.'
                });

                // D. Create Questions for the Exam
                const questionsDocs = [];
                for (let q = 1; q <= 5; q++) {
                    const question = await Question.create({
                        tenantId: tenant._id,
                        subjectId: subject._id,
                        questionText: `Pregunta ${q} (${difficulties[i]}): ¿Cuál es el procedimiento correcto para...?`,
                        type: 'multiple_choice',
                        difficulty: i === 0 ? 'easy' : (i === 3 ? 'hard' : 'medium'),
                        options: [
                            { text: 'Procedimiento A (Correcto)', isCorrect: true },
                            { text: 'Procedimiento B (Incorrecto)', isCorrect: false },
                            { text: 'Procedimiento C (Incorrecto)', isCorrect: false },
                            { text: 'Procedimiento D (Incorrecto)', isCorrect: false }
                        ],
                        createdBy: teacher._id,
                        tags: [difficulties[i], subject.name]
                    });
                    questionsDocs.push(question._id);
                }

                // E. Create Evaluation (The actual test event)
                const evaluation = await Evaluation.create({
                    tenantId: tenant._id,
                    courseId: course._id,
                    subjectId: subject._id,
                    title: `Prueba ${difficulties[i]} (Base: Planificación ${i + 1})`,
                    type: 'sumativa',
                    category: 'planificada',
                    date: planningDates[i],
                    questions: questionsDocs,
                    maxScore: 7.0,
                    objectives: [`Evaluar unidad ${i + 1}`] // This is consistent with evaluationModel (array of strings)
                });

                // Link Evaluation to Planning ? (Not strictly in model but good conceptual link)
                // We don't have a direct field, so we rely on subject/date proximity or manually if needed.
                // But the user asked for "creation of tests based on planning". The naming and dates align.

                // F. Assign Grades
                for (const student of students) {
                    // Grades improve slightly or vary randomly
                    const baseScore = 3.5 + (Math.random() * 3.5); // 3.5 to 7.0
                    const score = parseFloat(baseScore.toFixed(1));

                    await Grade.create({
                        tenantId: tenant._id,
                        evaluationId: evaluation._id,
                        estudianteId: student._id,
                        score: score
                    });
                }
            }
        }
        console.log(`✅ Planning (w/Objectives), Rubrics, Exams, and Grades created for March/April 2026.`);

        console.log('\n=============================================');
        console.log('🏫 COLEGIO BICENTENARIO MARÍTIMO - DATA GENERATED');
        console.log('=============================================');
        console.log(`Tenant ID: ${tenant._id}`);
        console.log(`Domain: ${tenant.domain}`);
        console.log('---------------------------------------------');

        console.log('👨‍🏫 PROFESORES Y CARRERAS (Password: 123456):');
        teachers.forEach(t => console.log(`- ${t.name}: ${t.email}`));

        console.log('---------------------------------------------');
        console.log('📆 HITOS DE EVALUACIÓN (Marzo - Abril):');
        planningDates.forEach((d, i) => console.log(`- Hito ${i + 1} (${difficulties[i]}): ${d.toLocaleDateString('es-CL')}`));
        console.log('=============================================');

        process.exit(0);

    } catch (error) {
        console.error('❌ Data Generation Failed:', error);
        process.exit(1);
    }
};

generateMaritimoData();
