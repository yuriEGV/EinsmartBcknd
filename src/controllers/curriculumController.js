import Subject from '../models/subjectModel.js';
import Planning from '../models/planningModel.js';
import Rubric from '../models/rubricModel.js';
import Question from '../models/questionModel.js';
import Evaluation from '../models/evaluationModel.js';
import Grade from '../models/gradeModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Estudiante from '../models/estudianteModel.js';
import Course from '../models/courseModel.js';
import Career from '../models/careerModel.js';
import mongoose from 'mongoose';

// PREDEFINED TP CURRICULUM SEED DATA BASED ON OFFICIAL DOCUMENTATION
const TP_CURRICULUM_DATA = {
    "Elaboracion Industrial de Alimentos": [
        { name: "Elaboración de alimentos de baja complejidad", desc: "Técnicas fundamentales para la preparación e industrialización de productos alimenticios." },
        { name: "Higiene para la elaboración de alimentos", desc: "Normas de inocuidad alimentaria, HACCP y sanitización de plantas industriales." },
        { name: "Almacenaje y bodega de alimentos e insumos", desc: "Control de inventarios, cadena de frío y sistemas de conservación." },
        { name: "Recepción de materias primas", desc: "Inspección de calidad, muestreo y pesaje de insumos en planta." },
        { name: "Aseguramiento de la calidad de procesos y alimentos", desc: "Monitoreo de puntos críticos de control y auditorías de calidad." },
        { name: "Envasado y embalaje de alimentos", desc: "Operación de maquinaria de envasado y rotulado bajo normas vigentes." },
        { name: "Operaciones de transferencia de calor", desc: "Pasteurización, esterilización y deshidratación de materias primas." },
        { name: "Control fisicoquímico y microbiológico de alimentos", desc: "Análisis de laboratorio para control microbiológico e instrumental." },
        { name: "Gestión del agua y residuos en la industria", desc: "Tratamiento de efluentes, sustentabilidad y manejo de residuos orgánicos." },
        { name: "Emprendimiento y empleabilidad", desc: "Habilidades laborales y desarrollo de proyectos de negocio alimentario." }
    ],
    "Gastronomia Mencion Cocina": [
        { name: "Servicio de comedores, bares y salones", desc: "Atención al cliente, protocolo de servicio y montaje de salones." },
        { name: "Higiene para la elaboración de alimentos", desc: "Higiene personal, inocuidad alimentaria y prevención de contaminación cruzada." },
        { name: "Elaboración de alimentos de baja complejidad", desc: "Técnicas básicas de corte, fondos y salsas madre." },
        { name: "Recepción y almacenamiento de insumos", desc: "Logística interna, rotación FIFO y control de mermas." },
        { name: "Planificación de la producción gastronómica", desc: "Diseño de minutas, cálculo de rendimiento y costeo de recetas." },
        { name: "Preparación, diseño y montaje de buffet", desc: "Técnicas de catering, presentación y conservación de buffet frío y caliente." },
        { name: "Elaboración de masas y pastas", desc: "Panadería básica, pastas frescas y masas leudadas." },
        { name: "Cocina de especialidad chilena", desc: "Rescate patrimonial de recetas e ingredientes tradicionales de Chile." },
        { name: "Cocina internacional", desc: "Técnicas e ingredientes de cocinas clásicas del mundo." },
        { name: "Bebidas y coctelería", desc: "Mixología básica, cata de vinos chilenos y maridaje." },
        { name: "Emprendimiento y empleabilidad", desc: "Formulación de planes de negocio gastronómicos y derecho laboral." }
    ],
    "Gastronomia Mencion Pasteleria y Reposteria": [
        { name: "Servicio de comedores, bares y salones", desc: "Atención al cliente, protocolo de servicio y montaje de salones." },
        { name: "Higiene para la elaboración de alimentos", desc: "Higiene personal, inocuidad alimentaria y prevención de contaminación cruzada." },
        { name: "Elaboración de alimentos de baja complejidad", desc: "Técnicas básicas de corte, fondos y salsas madre." },
        { name: "Recepción y almacenamiento de insumos", desc: "Logística interna, rotación FIFO y control de mermas." },
        { name: "Planificación de la producción gastronómica", desc: "Diseño de minutas, cálculo de rendimiento y costeo de recetas." },
        { name: "Preparación, diseño y montaje de buffet", desc: "Técnicas de catering, presentación y conservación de buffet frío y caliente." },
        { name: "Elaboración de masas y pastas", desc: "Panadería básica, pastas frescas y masas leudadas." },
        { name: "Elaboración de productos de pastelería", desc: "Masas batidas, cremas rellenas y bizcochos." },
        { name: "Elaboración de productos de repostería", desc: "Postres al plato, salsas dulces y helados artesanales." },
        { name: "Innovación en la pastelería y repostería", desc: "Tendencias modernas, pastelería vegana y sin gluten." },
        { name: "Emprendimiento y empleabilidad", desc: "Formulación de planes de negocio gastronómicos y derecho laboral." }
    ],
    "Mecanica Automotriz": [
        { name: "Ajuste de motores", desc: "Metrología, desmontaje, rectificación y armado de motores de combustión." },
        { name: "Lectura de planos y manuales técnicos", desc: "Interpretación de diagramas hidráulicos, neumáticos y esquemas eléctricos." },
        { name: "Manejo de residuos y desechos automotrices", desc: "Clasificación de aceites, baterías y refrigerantes bajo normativa ambiental." },
        { name: "Mantenimiento de sistemas eléctricos y electrónicos", desc: "Diagnóstico de baterías, alternadores, motores de partida y sensores." },
        { name: "Mantenimiento de sistemas de seguridad y confortabilidad", desc: "Sistemas ABS, Airbags, climatización y cierre centralizado." },
        { name: "Mantenimiento de motores", desc: "Afinamiento de motores bencineros y diésel, sistemas de inyección." },
        { name: "Mantenimiento de sistemas hidráulicos y neumáticos", desc: "Compresores, servofrenos, bombas hidráulicas y acumuladores." },
        { name: "Mantenimiento de los sistemas de transmisión y frenos", desc: "Cajas de cambio manual y automática, embragues, frenos de disco y tambor." },
        { name: "Mantenimiento de sistemas de dirección y suspensión", desc: "Alineación, balanceo, amortiguación y servoasistencia." },
        { name: "Emprendimiento y empleabilidad", desc: "Gestión de talleres mecánicos y atención al cliente." }
    ],
    "Operaciones Portuarias": [
        { name: "Documentación en la Operación Portuaria", desc: "Bill of Lading (B/L), manifiesto de carga y guías de despacho portuarias." },
        { name: "Consolidación y Desconsolidación de Contenedores", desc: "Llenado y vaciado de contenedores, trincado de cargas y cubicación." },
        { name: "Seguridad y Prevención de Riesgos en Faenas Portuarias", desc: "Normas ISPS, uso de EPP y planes de emergencia portuaria." },
        { name: "Operación de Movilizacion y Distribución de Cargas", desc: "Logística de patio, flujo de grúas horquilla y RTG." },
        { name: "Tramitación y Documentación de Recepción y Despacho", desc: "Aduanas, control de sellos de seguridad e inspección SAG." },
        { name: "Tramitación de Movilización y Distribución de Cargas", desc: "Sistemas de información portuaria (TOS) y ruteo terrestre." },
        { name: "Estiba y Desestiba de Naves Mercantes", desc: "Planificación de carga abordo, estabilidad de naves y grúas pórtico." },
        { name: "Organización y Almacenamiento en Zonas de Depósito", desc: "Gestión de almacenes extraportuarios y control de temperatura." },
        { name: "Emprendimiento y Empleabilidad", desc: "Desarrollo de proyectos logísticos y legislación naviera." }
    ],
    "Quimica Industrial Mencion Laboratorio Quimico": [
        { name: "Manejo y almacenamiento seguro de materiales", desc: "Fichas de seguridad (HDS), almacenamiento segregado y etiquetado SGA." },
        { name: "Técnicas, procesos y equipos de laboratorio", desc: "Operaciones básicas de filtración, destilación, centrifugación y balanzas analíticas." },
        { name: "Fabricación de productos industriales", desc: "Formulación de jabones, detergentes, pinturas y biocidas a escala piloto." },
        { name: "Cuidado del medioambiente y tratamiento de residuos", desc: "Neutralización de ácidos, precipitación de metales pesados y reciclaje de solventes." },
        { name: "Toma de muestra", desc: "Muestreo representativo de aguas, suelos y materias primas gaseosas." },
        { name: "Preparación de muestras para análisis orgánico", desc: "Extracción líquido-líquido, Soxhlet y digestión ácida." },
        { name: "Mantenimiento de equipos e instrumentos de laboratorio", desc: "Calibración de pH-metros, electrodos y espectrofotómetros." },
        { name: "Técnicas de análisis físico-químico", desc: "Titulación ácido-base, gravimetría y refractometría." },
        { name: "Técnicas de análisis instrumental", desc: "Cromatografía líquida (HPLC) y espectroscopía UV-Visible." },
        { name: "Emprendimiento y empleabilidad", desc: "Acreditación de laboratorios (ISO 17025) y desarrollo profesional." }
    ]
};

class CurriculumController {

    static async populateTechnicalCurriculum(req, res) {
        try {
            const { courseId, careerName } = req.body;
            const tenantId = req.user.tenantId;
            const teacherId = req.user.userId;

            if (!courseId || !careerName) {
                return res.status(400).json({ message: "Se requiere courseId y el nombre de la carrera profesional (careerName)." });
            }

            const modules = TP_CURRICULUM_DATA[careerName];
            if (!modules) {
                return res.status(400).json({ message: `Carrera no soportada o inexistente. Opciones: ${Object.keys(TP_CURRICULUM_DATA).join(', ')}` });
            }

            // 1. Fetch enrolled students
            const enrolled = await Enrollment.find({
                courseId: new mongoose.Types.ObjectId(courseId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                status: { $in: ['confirmada', 'activo', 'activa'] }
            }).select('estudianteId');

            if (enrolled.length === 0) {
                return res.status(400).json({ message: "El curso seleccionado no tiene alumnos activos matriculados. Matricule alumnos primero." });
            }

            const studentIds = enrolled.filter(e => e && e.estudianteId).map(e => e.estudianteId);

            // Find or create Career
            let career = await Career.findOne({ tenantId, name: careerName });
            if (!career) {
                career = new Career({
                    tenantId,
                    name: careerName,
                    description: `Especialidad Técnica Profesional de ${careerName}`,
                    type: 'tecnico-profesional'
                });
                await career.save();
            }

            // Update course's careerId
            await Course.findByIdAndUpdate(courseId, { careerId: career._id });

            let createdSubjectsCount = 0;
            let createdPlanningsCount = 0;
            let createdRubricsCount = 0;
            let createdQuestionsCount = 0;
            let createdEvaluationsCount = 0;
            let createdGradesCount = 0;

            for (const mod of modules) {
                // Find or create subject
                let subject = await Subject.findOne({
                    tenantId,
                    courseId,
                    name: mod.name
                });

                if (!subject) {
                    subject = new Subject({
                        tenantId,
                        courseId,
                        teacherId,
                        name: mod.name,
                        description: mod.desc,
                        isTechnical: true,
                        isComplementary: false
                    });
                    await subject.save();
                    createdSubjectsCount++;
                }

                // 2. Create Rubric
                const rubric = new Rubric({
                    tenantId,
                    teacherId,
                    subjectId: subject._id,
                    title: `Rúbrica de Desempeño: ${mod.name}`,
                    description: `Evaluación sumativa de competencias prácticas del módulo ${mod.name}`,
                    levels: [
                        { name: "Destacado", points: 7 },
                        { name: "Logrado", points: 5 },
                        { name: "No Logrado", points: 3 }
                    ],
                    criteria: [
                        { name: "Procedimientos Técnicos", descriptors: [
                            { levelName: "Destacado", text: "Aplica de forma rigurosa cada paso del protocolo técnico oficial." },
                            { levelName: "Logrado", text: "Realiza el procedimiento técnico cometiendo errores menores." },
                            { levelName: "No Logrado", text: "No domina la secuencia metodológica ni el uso de instrumental." }
                        ]},
                        { name: "Normas de Seguridad e Higiene", descriptors: [
                            { levelName: "Destacado", text: "Cumple 100% con los estándares de EPP, orden, sanitización y autocuidado." },
                            { levelName: "Logrado", text: "Cumple las normas pero requiere supervisión en el orden del taller." },
                            { levelName: "No Logrado", text: "Pone en riesgo su integridad o contamina las muestras de alimentos." }
                        ]}
                    ],
                    status: "approved"
                });
                await rubric.save();
                createdRubricsCount++;

                // 3. Create Plannings
                const p1 = new Planning({
                    tenantId,
                    subjectId: subject._id,
                    teacherId,
                    type: "unidad",
                    title: "Unidad 1: Fundamentos de la Especialidad",
                    description: `Introducción teórica y práctica a los conceptos de ${mod.name}.`,
                    status: "approved",
                    rubricId: rubric._id,
                    unitNumber: 1
                });
                const p2 = new Planning({
                    tenantId,
                    subjectId: subject._id,
                    teacherId,
                    type: "unidad",
                    title: "Unidad 2: Procesos Industriales Avanzados",
                    description: `Aplicaciones de campo y simulación laboral del módulo ${mod.name}.`,
                    status: "approved",
                    rubricId: rubric._id,
                    unitNumber: 2
                });
                await Promise.all([p1.save(), p2.save()]);
                createdPlanningsCount += 2;

                // 4. Create sample questions
                const q1 = new Question({
                    tenantId,
                    subjectId: subject._id,
                    questionText: "¿Cuál es el protocolo de seguridad obligatorio al ingresar a la faena del módulo?",
                    type: "multiple_choice",
                    options: [
                        { text: "Uso obligatorio de EPP completo y check-list de herramientas", isCorrect: true },
                        { text: "Ingresar sin implementos de seguridad", isCorrect: false },
                        { text: "Solo usar overol básico", isCorrect: false },
                        { text: "Ninguna de las anteriores", isCorrect: false }
                    ],
                    difficulty: "medium",
                    status: "approved",
                    createdBy: teacherId
                });
                const q2 = new Question({
                    tenantId,
                    subjectId: subject._id,
                    questionText: "¿Cuál es el principio regulador o norma de calidad aplicable a este proceso?",
                    type: "multiple_choice",
                    options: [
                        { text: "Normativa nacional vigente e ISO 9001", isCorrect: true },
                        { text: "Criterio libre del operador", isCorrect: false },
                        { text: "No existe regulación en esta materia", isCorrect: false }
                    ],
                    difficulty: "hard",
                    status: "approved",
                    createdBy: teacherId
                });
                await Promise.all([q1.save(), q2.save()]);
                createdQuestionsCount += 2;

                // 5. Create 2 evaluations
                const ev1 = new Evaluation({
                    tenantId,
                    courseId,
                    subjectId: subject._id,
                    title: "Evaluación Teórica 1",
                    type: "sumativa",
                    category: "planificada",
                    maxScore: 7.0,
                    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                    rubricId: rubric._id,
                    status: "approved",
                    questions: [q1._id, q2._id]
                });
                const ev2 = new Evaluation({
                    tenantId,
                    courseId,
                    subjectId: subject._id,
                    title: "Práctica de Taller / Laboratorio",
                    type: "sumativa",
                    category: "planificada",
                    maxScore: 7.0,
                    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                    rubricId: rubric._id,
                    status: "approved",
                    questions: [q1._id]
                });
                await Promise.all([ev1.save(), ev2.save()]);
                createdEvaluationsCount += 2;

                // 6. Generate grades (18 to 20 grades total per student is guaranteed by 2 evals * 10 subjects = 20 grades!)
                const gradesToSave = [];
                for (const studentId of studentIds) {
                    // Generate realistic grade distribution:
                    // 85% chance of passing score (4.0 to 7.0)
                    // 15% chance of failing score (1.5 to 3.9)
                    const isPassing1 = Math.random() > 0.15;
                    const score1 = isPassing1 
                        ? parseFloat((4.0 + Math.random() * 3.0).toFixed(1))
                        : parseFloat((1.5 + Math.random() * 2.4).toFixed(1));

                    const isPassing2 = Math.random() > 0.10; // slightly higher passing rate for practicals
                    const score2 = isPassing2 
                        ? parseFloat((4.0 + Math.random() * 3.0).toFixed(1))
                        : parseFloat((1.5 + Math.random() * 2.4).toFixed(1));

                    gradesToSave.push({
                        tenantId,
                        evaluationId: ev1._id,
                        estudianteId: studentId,
                        score: score1,
                        status: "graded",
                        academicYear: new Date().getFullYear()
                    });
                    gradesToSave.push({
                        tenantId,
                        evaluationId: ev2._id,
                        estudianteId: studentId,
                        score: score2,
                        status: "graded",
                        academicYear: new Date().getFullYear()
                    });
                    createdGradesCount += 2;
                }

                if (gradesToSave.length > 0) {
                    await Grade.insertMany(gradesToSave);
                }
            }

            res.status(200).json({
                message: "Currículum Técnico Profesional cargado y poblado exitosamente.",
                details: {
                    subjectsCreated: createdSubjectsCount,
                    planningsCreated: createdPlanningsCount,
                    rubricsCreated: createdRubricsCount,
                    questionsCreated: createdQuestionsCount,
                    evaluationsCreated: createdEvaluationsCount,
                    gradesCreated: createdGradesCount
                }
            });

        } catch (error) {
            console.error("Populate Technical Curriculum Error:", error);
            res.status(500).json({ message: "Error del servidor al poblar currículum técnico.", error: error.message });
        }
    }

    static async getTechnicalCurriculumReport(req, res) {
        try {
            const { courseId } = req.params;
            const tenantId = req.user.tenantId;

            // 1. Fetch enrolled students
            const enrollments = await Enrollment.find({
                courseId: new mongoose.Types.ObjectId(courseId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                status: { $in: ['confirmada', 'activo', 'activa'] }
            }).populate({
                path: 'estudianteId',
                select: 'nombres apellidos rut'
            });

            if (enrollments.length === 0) {
                return res.json({
                    stats: { overallApprovalRate: 0, totalEvaluations: 0, totalGrades: 0, totalStudents: 0 },
                    modules: [],
                    studentAverages: []
                });
            }

            // Extract students sorted by last name
            const students = enrollments
                .filter(e => e && e.estudianteId)
                .map(e => e.estudianteId)
                .sort((a, b) => a.apellidos.localeCompare(b.apellidos));

            // 2. Fetch technical subjects
            const subjects = await Subject.find({
                courseId: new mongoose.Types.ObjectId(courseId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                isTechnical: true
            });

            if (subjects.length === 0) {
                return res.json({
                    stats: { overallApprovalRate: 0, totalEvaluations: 0, totalGrades: 0, totalStudents: students.length },
                    modules: [],
                    studentAverages: []
                });
            }

            const subjectIds = subjects.map(s => s._id);

            // 3. Fetch evaluations for these subjects
            const evaluations = await Evaluation.find({
                courseId: new mongoose.Types.ObjectId(courseId),
                tenantId: new mongoose.Types.ObjectId(tenantId),
                subjectId: { $in: subjectIds }
            });

            const evalIds = evaluations.map(e => e._id);

            // 4. Fetch grades
            const grades = await Grade.find({
                tenantId: new mongoose.Types.ObjectId(tenantId),
                evaluationId: { $in: evalIds },
                status: 'graded'
            });

            // 5. Calculate metrics
            let totalPassingGrades = 0;
            let totalGrades = grades.length;

            grades.forEach(g => {
                if (g.score >= 4.0) {
                    totalPassingGrades++;
                }
            });

            const overallApprovalRate = totalGrades > 0
                ? Math.round((totalPassingGrades / totalGrades) * 100)
                : 100;

            // Calculations per module
            const modulesStats = subjects.map(sub => {
                const subEvals = evaluations.filter(e => e.subjectId.toString() === sub._id.toString());
                const subEvalIds = subEvals.map(e => e._id.toString());
                const subGrades = grades.filter(g => subEvalIds.includes(g.evaluationId.toString()));

                let sumScores = 0;
                let passingCount = 0;
                let gradesCount = subGrades.length;

                subGrades.forEach(g => {
                    sumScores += g.score;
                    if (g.score >= 4.0) {
                        passingCount++;
                    }
                });

                const averageScore = gradesCount > 0
                    ? parseFloat((sumScores / gradesCount).toFixed(2))
                    : 0;

                const approvalPercentage = gradesCount > 0
                    ? Math.round((passingCount / gradesCount) * 100)
                    : 100;

                return {
                    id: sub._id,
                    name: sub.name,
                    description: sub.description || '',
                    evaluationsCount: subEvals.length,
                    gradesCount,
                    averageScore,
                    approvalPercentage,
                    evaluationTitles: subEvals.map(e => e.title)
                };
            });

            // Calculations per student
            const studentAverages = students.map(student => {
                const modularScores = {};
                let studentPassingCount = 0;
                let studentGradesCount = 0;

                subjects.forEach(sub => {
                    const subEvals = evaluations.filter(e => e.subjectId.toString() === sub._id.toString());
                    const subEvalIds = subEvals.map(e => e._id.toString());
                    const studentSubGrades = grades.filter(g => 
                        g.estudianteId.toString() === student._id.toString() &&
                        subEvalIds.includes(g.evaluationId.toString())
                    );

                    let sumScores = 0;
                    let count = studentSubGrades.length;

                    studentSubGrades.forEach(g => {
                        sumScores += g.score;
                        studentGradesCount++;
                        if (g.score >= 4.0) {
                            studentPassingCount++;
                        }
                    });

                    const avg = count > 0 
                        ? parseFloat((sumScores / count).toFixed(1))
                        : null;

                    modularScores[sub._id] = avg;
                });

                const approvalPct = studentGradesCount > 0
                    ? Math.round((studentPassingCount / studentGradesCount) * 100)
                    : 100;

                return {
                    id: student._id,
                    fullName: `${student.apellidos}, ${student.nombres}`,
                    rut: student.rut || 'S/I',
                    modularScores,
                    approvalPercentage: approvalPct
                };
            });

            res.status(200).json({
                stats: {
                    overallApprovalRate,
                    totalEvaluations: evaluations.length,
                    totalGrades,
                    totalStudents: students.length
                },
                modules: modulesStats,
                studentAverages
            });

        } catch (error) {
            console.error("Get Technical Curriculum Report Error:", error);
            res.status(500).json({ message: "Error al generar informe técnico profesional.", error: error.message });
        }
    }
}

export default CurriculumController;
