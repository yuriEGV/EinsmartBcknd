
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
import Objective from '../src/models/objectiveModel.js';

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
        const tenantName = "Instituto Bicentenario Maritimo";
        let tenant = await Tenant.findOne({ name: tenantName });

        if (!tenant) {
            console.log(`⚠️ Tenant '${tenantName}' not found. Searching by ID...`);
            tenant = await Tenant.findById('6984af03b00f020e9834b948');
        }

        if (!tenant) {
            console.error(`❌ Tenant not found. Please create it first or check the name.`);
            process.exit(1);
        }

        console.log(`✅ Using Tenant: ${tenant.name} (ID: ${tenant._id})`);

        const passwordHash = await bcrypt.hash('123456', 10);

        // 2. Define Contexts/Careers
        const careers = [
            {
                code: 'MEC',
                name: 'Mecánica Automotriz',
                teacher: { name: 'Prof. Mecánica', email: 'profe.mecanica' },
                rubricCriteria: [
                    { name: 'Diagnóstico de Fallas', descriptors: ['Identifica la falla exactitud', 'Identifica fallas generales', 'Confunde síntomas', 'No identifica fallas'] },
                    { name: 'Uso de Herramientas', descriptors: ['Uso experto y seguro', 'Uso correcto', 'Uso descuidado', 'Uso peligroso'] }
                ],
                questions: [
                    '¿Qué indica el humo azul en el escape?',
                    'Orden de encendido motor 4 cilindros',
                    'Función del alternador',
                    'Medición de compresión',
                    'Torque de culata'
                ]
            },
            {
                code: 'GAS',
                name: 'Gastronomía',
                teacher: { name: 'Prof. Gastronomía', email: 'profe.gastro' },
                rubricCriteria: [
                    { name: 'Higiene y Manipulación', descriptors: ['Normas HACCP perfectas', 'Cumple normas básicas', 'Errores menores de higiene', 'Riesgo de contaminación'] },
                    { name: 'Presentación (Emplatado)', descriptors: ['Creativo y balanceado', 'Limpio y ordenado', 'Desordenado', 'Sin presentación'] }
                ],
                questions: [
                    'Temperatura interna del pollo cocido',
                    'Dimensiones del corte Brunoise',
                    'Ingredientes de la Salsa Bechamel',
                    'Contaminación cruzada',
                    'Tiempos de leudado'
                ]
            },
            {
                code: 'QUI',
                name: 'Química Industrial',
                teacher: { name: 'Prof. Química', email: 'profe.quimica' },
                rubricCriteria: [
                    { name: 'Seguridad en Laboratorio', descriptors: ['Uso EPP completo y correcto', 'Uso parcial de EPP', 'Olvida normas básicas', 'Conducta riesgosa'] },
                    { name: 'Análisis de Muestras', descriptors: ['Resultado exacto <1% error', 'Error <5%', 'Error <10%', 'Resultado incorrecto'] }
                ],
                questions: [
                    'Cálculo de Molaridad',
                    'Balanceo de ecuaciones redox',
                    'Uso de la pipeta aforada',
                    'Reacción ácido-base',
                    'Norma ISO 17025'
                ]
            },
            {
                code: 'POR',
                name: 'Operaciones Portuarias',
                teacher: { name: 'Prof. Puertos', email: 'profe.puertos' },
                rubricCriteria: [
                    { name: 'Logística y Estiba', descriptors: ['Optimización máxima de carga', 'Carga balanceada', 'Errores de distribución', 'Carga inestable'] },
                    { name: 'Documentación Aduanera', descriptors: ['Documentación impecable', 'Errores menores', 'Faltan datos clave', 'Documentación rechazada'] }
                ],
                questions: [
                    'Tipos de contenedores',
                    'Documento BL (Bill of Lading)',
                    'Uso de Grúa Pórtico',
                    'Seguridad en patio de camiones',
                    'Código IMDG'
                ]
            },
            {
                code: 'ALI',
                name: 'Elaboración de Alimentos',
                teacher: { name: 'Prof. Alimentos', email: 'profe.alimentos' },
                rubricCriteria: [
                    { name: 'Control de Calidad', descriptors: ['Muestreo representativo', 'Muestreo aceptable', 'Errores en muestreo', 'Sin control'] },
                    { name: 'Procesamiento', descriptors: ['Proceso estandarizado', 'Variaciones menores', 'Variaciones notables', 'Producto defectuoso'] }
                ],
                questions: [
                    'Pasteurización vs Esterilización',
                    'Uso de Aditivos alimentarios',
                    'Cadena de frío',
                    'Fermentación láctica',
                    'Etiquetado nutricional'
                ]
            }
        ];

        // 3. Cleanup Previous Data (for these specific teachers)
        console.log('🧹 Cleaning up previous test data...');
        for (const c of careers) {
            const email = `${c.teacher.email}.${tenant._id}@maritimo.cl`;
            const user = await User.findOne({ email });
            if (user) {
                // Delete associated data
                const course = await Course.findOne({ teacherId: user._id });
                if (course) {
                    // Delete students and their grades
                    const enrollments = await Enrollment.find({ courseId: course._id });
                    for (const enrollment of enrollments) {
                        await Grade.deleteMany({ estudianteId: enrollment.estudianteId });
                        await User.deleteOne({ profileId: enrollment.estudianteId, role: 'student' });
                        await Estudiante.deleteOne({ _id: enrollment.estudianteId });
                    }
                    await Enrollment.deleteMany({ courseId: course._id });
                    await Evaluation.deleteMany({ courseId: course._id });
                    await Course.deleteOne({ _id: course._id });
                }
                const subject = await Subject.findOne({ teacherId: user._id });
                if (subject) {
                    await Planning.deleteMany({ subjectId: subject._id });
                    await Rubric.deleteMany({ subjectId: subject._id });
                    await Question.deleteMany({ subjectId: subject._id });
                    await Objective.deleteMany({ subjectId: subject._id });
                    await Subject.deleteOne({ _id: subject._id });
                }
                await User.deleteOne({ _id: user._id }); // Delete Teacher
            }
        }
        console.log('✅ Cleanup complete.');


        // 4. Create New Data
        const planningDates = [
            // March
            { unit: 'Unidad 1', evalDate: new Date('2026-03-13T10:00:00'), planStart: new Date('2026-03-02T10:00:00'), planEnd: new Date('2026-03-13T10:00:00') },
            { unit: 'Unidad 2', evalDate: new Date('2026-03-27T10:00:00'), planStart: new Date('2026-03-16T10:00:00'), planEnd: new Date('2026-03-27T10:00:00') },
            // April
            { unit: 'Unidad 3', evalDate: new Date('2026-04-10T10:00:00'), planStart: new Date('2026-03-30T10:00:00'), planEnd: new Date('2026-04-10T10:00:00') },
            { unit: 'Unidad 4', evalDate: new Date('2026-04-24T10:00:00'), planStart: new Date('2026-04-13T10:00:00'), planEnd: new Date('2026-04-24T10:00:00') },
            // May
            { unit: 'Unidad 5', evalDate: new Date('2026-05-08T10:00:00'), planStart: new Date('2026-04-27T10:00:00'), planEnd: new Date('2026-05-08T10:00:00') },
            { unit: 'Unidad 6', evalDate: new Date('2026-05-22T10:00:00'), planStart: new Date('2026-05-11T10:00:00'), planEnd: new Date('2026-05-22T10:00:00') },
            // June
            { unit: 'Unidad 7', evalDate: new Date('2026-06-05T10:00:00'), planStart: new Date('2026-05-25T10:00:00'), planEnd: new Date('2026-06-05T10:00:00') },
            { unit: 'Unidad 8 (Final)', evalDate: new Date('2026-06-19T10:00:00'), planStart: new Date('2026-06-08T10:00:00'), planEnd: new Date('2026-06-19T10:00:00') }
        ];
        const difficulties = ['Básico', 'Intermedio', 'Intermedio', 'Avanzado', 'Avanzado', 'Avanzado', 'Experto', 'Experto'];

        for (let i = 0; i < careers.length; i++) {
            const car = careers[i];

            // A. Create Teacher
            const teacher = await User.create({
                tenantId: tenant._id,
                name: car.teacher.name,
                email: `${car.teacher.email}.${tenant._id}@maritimo.cl`,
                passwordHash,
                role: 'teacher',
                rut: `${15 + i}.111.111-${i}`,
                specialization: car.name
            });

            // B. Create Course & Subject
            const letter = String.fromCharCode(65 + i);
            const course = await Course.create({
                tenantId: tenant._id,
                name: `3° Medio ${letter} - ${car.name}`,
                level: 'III° Medio',
                letter: letter,
                teacherId: teacher._id,
                description: `Especialidad de ${car.name}`
            });

            const subject = await Subject.create({
                tenantId: tenant._id,
                name: `Módulo: ${car.name}`,
                courseId: course._id,
                teacherId: teacher._id
            });

            // C. Create Students (5)
            const students = [];
            for (let j = 1; j <= 5; j++) {
                const rutRandom = `${20 + j}.000.${100 + i}-${j}`;
                const student = await Estudiante.create({
                    tenantId: tenant._id,
                    nombres: `Alumno ${j}`,
                    apellidos: `De ${car.code}`,
                    rut: rutRandom,
                    email: `alumno${j}.${course._id}@maritimo.cl`,
                    matricula: `MAR-${car.code}-${j}`
                });

                await User.create({
                    tenantId: tenant._id,
                    name: `${student.nombres} ${student.apellidos}`,
                    email: student.email,
                    passwordHash,
                    role: 'student',
                    profileId: student._id,
                    rut: rutRandom
                });

                await Enrollment.create({
                    tenantId: tenant._id,
                    estudianteId: student._id,
                    courseId: course._id,
                    period: '2026',
                    status: 'confirmada'
                });
                students.push(student);
            }

            // D. Create Planning & Rubrics & Evaluations for each unit
            for (let k = 0; k < planningDates.length; k++) {
                const unitData = planningDates[k];
                const difficulty = difficulties[k];

                // 1. Create Rubric (Adapted Content)
                const rubric = await Rubric.create({
                    tenantId: tenant._id,
                    teacherId: teacher._id,
                    subjectId: subject._id,
                    title: `Rúbrica ${difficulty}: ${car.name} - ${unitData.unit}`,
                    description: `Evaluación de ${car.rubricCriteria[0].name} y ${car.rubricCriteria[1].name}`,
                    levels: [
                        { name: 'Experto', points: 4 },
                        { name: 'Avanzado', points: 3 },
                        { name: 'Intermedio', points: 2 },
                        { name: 'Novato', points: 1 }
                    ],
                    criteria: car.rubricCriteria.map(crit => ({
                        name: crit.name,
                        descriptors: [
                            { levelName: 'Experto', text: crit.descriptors[0] },
                            { levelName: 'Avanzado', text: crit.descriptors[1] },
                            { levelName: 'Intermedio', text: crit.descriptors[2] },
                            { levelName: 'Novato', text: crit.descriptors[3] }
                        ]
                    }))
                });

                // 2. Create Objectives
                const obj = await Objective.create({
                    tenantId: tenant._id,
                    subjectId: subject._id,
                    code: `OA-TP-${k + 1}`,
                    description: `Domina competencias de ${car.name} nivel ${difficulty} - ${unitData.unit}`,
                    active: true
                });

                // 3. Create Planning Linked to Rubric
                await Planning.create({
                    tenantId: tenant._id,
                    subjectId: subject._id,
                    teacherId: teacher._id,
                    unit: unitData.unit,
                    title: `Planificación ${difficulty} - ${unitData.unit}`,
                    description: `Preparación de la prueba práctica de ${car.name}`,
                    startDate: unitData.planStart,
                    endDate: unitData.planEnd,
                    status: 'approved',
                    rubricId: rubric._id,
                    objectives: [obj._id],
                    activities: `Taller práctico de ${car.name} nivel ${difficulty}`
                });

                // 4. Create Questions (Adapted)
                const questionsDocs = [];
                for (let q = 0; q < car.questions.length; q++) {
                    const question = await Question.create({
                        tenantId: tenant._id,
                        subjectId: subject._id,
                        questionText: `${car.questions[q]} (Nivel ${difficulty})`,
                        type: 'multiple_choice',
                        difficulty: k < 2 ? 'easy' : (k >= 6 ? 'hard' : 'medium'),
                        options: [
                            { text: 'Respuesta Correcta', isCorrect: true },
                            { text: 'Opción Incorrecta A', isCorrect: false },
                            { text: 'Opción Incorrecta B', isCorrect: false }
                        ],
                        createdBy: teacher._id
                    });
                    questionsDocs.push(question._id);
                }

                // 5. Create Evaluation (Test)
                const evaluation = await Evaluation.create({
                    tenantId: tenant._id,
                    courseId: course._id,
                    subjectId: subject._id,
                    title: `Prueba ${difficulty}: ${car.name} - ${unitData.unit}`,
                    type: 'sumativa',
                    category: 'planificada',
                    date: unitData.evalDate,
                    questions: questionsDocs,
                    maxScore: 7.0,
                    objectives: [`Evaluar ${difficulty} - ${unitData.unit}`]
                });

                // 6. Grades
                for (const student of students) {
                    const score = parseFloat((Math.random() * (3.0) + 4.0).toFixed(1));
                    await Grade.create({
                        tenantId: tenant._id,
                        evaluationId: evaluation._id,
                        estudianteId: student._id,
                        score: score
                    });
                }
            }
        }

        console.log(`✅ Career-specific data created for 5 specialties with adapted Rubrics/Questions.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Data Generation Failed:', error);
        process.exit(1);
    }
};

generateMaritimoData();
