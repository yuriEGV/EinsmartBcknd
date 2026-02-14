import Evaluation from '../models/evaluationModel.js';
import NotificationService from '../services/notificationService.js';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import Schedule from '../models/scheduleModel.js';

class EvaluationController {
    // Create a new evaluation
    static async createEvaluation(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para crear evaluaciones.' });
            }

            // Validate required fields
            const { courseId, subjectId, title, date } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({ message: 'El título es obligatorio.' });
            }

            if (!courseId || !subjectId || !date) {
                return res.status(400).json({ message: 'Debe seleccionar un curso, una asignatura y una fecha.' });
            }

            if (!mongoose.Types.ObjectId.isValid(courseId)) {
                return res.status(400).json({ message: 'El ID del curso no es válido.' });
            }

            if (!mongoose.Types.ObjectId.isValid(subjectId)) {
                return res.status(400).json({ message: 'El ID de la asignatura no es válido.' });
            }

            // [CONFLICT DETECTION] Check for concurrent evaluations in same course
            const conflictQuery = {
                courseId,
                date: {
                    $gte: new Date(new Date(date).setHours(new Date(date).getHours() - 1)), // 1 hour buffer
                    $lte: new Date(new Date(date).setHours(new Date(date).getHours() + 1))
                },
                tenantId: req.user.tenantId
            };
            const existingEval = await Evaluation.findOne(conflictQuery);
            if (existingEval) {
                return res.status(409).json({
                    message: `Ya existe una evaluación ("${existingEval.title}") programada en este bloque horario para este curso.`
                });
            }

            // [STRICT SCHEDULE ENFORCEMENT]
            const evalDate = new Date(req.body.date);
            const dayOfWeek = evalDate.getDay();
            const evalTimeStr = evalDate.toTimeString().slice(0, 5); // "HH:mm"

            const schedules = await Schedule.find({
                tenantId: req.user.tenantId,
                courseId,
                subjectId,
                dayOfWeek
            });

            if (schedules.length === 0) {
                return res.status(400).json({
                    message: `No hay clases de esta asignatura programadas para el día ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]}.`
                });
            }

            // Check if evalTimeStr is within any of the found schedule blocks
            const isWithinSchedule = schedules.some(s => {
                return evalTimeStr >= s.startTime && evalTimeStr <= s.endTime;
            });

            if (!isWithinSchedule) {
                return res.status(400).json({
                    message: `La evaluación (${evalTimeStr}) está fuera del horario de clases para esta asignatura (${schedules.map(s => `${s.startTime}-${s.endTime}`).join(', ')}).`
                });
            }

            const evaluation = new Evaluation({
                ...req.body,
                tenantId: req.user.tenantId,
                status: (['admin', 'director', 'utp'].includes(req.user.role)) ? 'approved' : 'draft'
            });
            await evaluation.save();
            await evaluation.populate('courseId', 'name code');

            // Notify Students ONLY if approved
            if (evaluation.status === 'approved') {
                NotificationService.notifyCourseAssessment(
                    evaluation.courseId._id,
                    evaluation.title,
                    evaluation.date,
                    evaluation.tenantId
                );
            }

            res.status(201).json(evaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Get all evaluations (Secure) with filters
    static async getEvaluations(req, res) {
        try {
            const { courseId, subjectId, studentId, guardianId } = req.query;
            const query = { tenantId: req.user.tenantId };

            if (courseId) {
                query.courseId = courseId;
            } else if (req.user.role === 'student' || req.user.role === 'apoderado') {
                const Enrollment = await import('../models/enrollmentModel.js').then(m => m.default);
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);

                let studentId;
                if (req.user.role === 'student') {
                    studentId = req.user.profileId;
                } else {
                    const guardian = await Apoderado.findById(req.user.profileId);
                    studentId = guardian?.estudianteId;
                }

                if (studentId) {
                    const enrollment = await Enrollment.findOne({
                        estudianteId: studentId,
                        tenantId: req.user.tenantId,
                        status: { $in: ['confirmada', 'activo', 'activa'] }
                    });
                    if (enrollment) {
                        query.courseId = enrollment.courseId;
                    } else {
                        return res.status(200).json([]); // No enrollment, no evaluations
                    }
                } else {
                    return res.status(403).json({ message: 'Perfil no vinculado' });
                }
            } else if (studentId || guardianId) {
                // ... handle explicit IDs for staff if needed
                if (studentId) {
                    const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
                    const student = await Estudiante.findById(studentId);
                    if (student) query.courseId = student.courseId;
                }
            }

            if (subjectId) query.subjectId = subjectId;

            // [APPROVAL STATUS FILTERING]
            if (req.user.role === 'student' || req.user.role === 'apoderado') {
                query.status = 'approved';
                query.category = { $ne: 'sorpresa' }; // Hide surprise tests from calendar
            }

            const evaluations = await Evaluation.find(query)
                .populate('courseId', 'name code')
                .populate('subjectId', 'name')
                .populate('questions')
                .populate('rubricId');

            res.status(200).json(evaluations);
        } catch (error) {
            console.error('getEvaluations error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    // Get evaluations by course (Secure)
    static async getEvaluationsByCourse(req, res) {
        try {
            const evaluations = await Evaluation.find({
                courseId: req.params.courseId,
                tenantId: req.user.tenantId
            })
                .populate('courseId', 'name code')
                .populate('subjectId', 'name')
                .populate('rubricId');
            res.status(200).json(evaluations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get evaluations by tenant (Secure)
    static async getEvaluationsByTenant(req, res) {
        try {
            const targetTenant = req.params.tenantId;
            if (req.user.role !== 'admin' && req.user.tenantId !== targetTenant) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const evaluations = await Evaluation.find({ tenantId: targetTenant })
                .populate('courseId', 'name code')
                .populate('subjectId', 'name')
                .populate('rubricId');
            res.status(200).json(evaluations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get a single evaluation by ID (Secure)
    static async getEvaluationById(req, res) {
        try {
            const evaluation = await Evaluation.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('courseId', 'name code')
                .populate('subjectId', 'name')
                .populate('rubricId');
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(200).json(evaluation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update an evaluation by ID (Secure)
    static async updateEvaluation(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para modificar evaluaciones.' });
            }

            const evaluation = await Evaluation.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }

            // [STRICT SCHEDULE ENFORCEMENT for Updates]
            if (req.body.date || req.body.courseId || req.body.subjectId) {
                const evalDate = new Date(req.body.date || evaluation.date);
                const dayOfWeek = evalDate.getDay();
                const evalTimeStr = evalDate.toTimeString().slice(0, 5);
                const courseId = req.body.courseId || evaluation.courseId;
                const subjectId = req.body.subjectId || evaluation.subjectId;

                const schedules = await Schedule.find({
                    tenantId: req.user.tenantId,
                    courseId,
                    subjectId,
                    dayOfWeek
                });

                if (schedules.length === 0) {
                    return res.status(400).json({
                        message: `No hay clases programadas para el día del cambio (${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]}).`
                    });
                }

                const isWithinSchedule = schedules.some(s => {
                    return evalTimeStr >= s.startTime && evalTimeStr <= s.endTime;
                });

                if (!isWithinSchedule) {
                    return res.status(400).json({
                        message: `El nuevo horario (${evalTimeStr}) está fuera de las clases (${schedules.map(s => `${s.startTime}-${s.endTime}`).join(', ')}).`
                    });
                }
            }

            const updatedEvaluation = await Evaluation.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            ).populate('courseId', 'name code').populate('subjectId', 'name').populate('rubricId');

            res.status(200).json(updatedEvaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Delete an evaluation by ID (Secure)
    static async deleteEvaluation(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para eliminar evaluaciones.' });
            }

            const evaluation = await Evaluation.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Print Evaluation to PDF
    static async printEvaluation(req, res) {
        try {
            const { difficulty } = req.query;
            const evaluation = await Evaluation.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('courseId', 'name level')
                .populate('subjectId', 'name')
                .populate('questions')
                .populate('rubricId');

            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }

            let questions = evaluation.questions || [];
            if (difficulty && difficulty !== 'all') {
                questions = questions.filter(q => q.difficulty === difficulty);
            }

            const doc = new PDFDocument({ margin: 50 });

            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${evaluation.title.replace(/\s+/g, '_')}.pdf`);

            doc.pipe(res);

            // Header Section
            doc.fontSize(20).font('Helvetica-Bold').text(evaluation.title.toUpperCase(), { align: 'center' });
            doc.moveDown();

            doc.fontSize(10).font('Helvetica');
            doc.text(`Curso: ${evaluation.courseId?.name || 'N/A'}`);
            doc.text(`Asignatura: ${evaluation.subjectId?.name || 'N/A'}`);
            doc.text(`Fecha: ${new Date(evaluation.date).toLocaleDateString()}`);
            doc.moveDown();

            // Student Name Field
            doc.rect(doc.x, doc.y, 300, 25).stroke();
            doc.text('Nombre:', doc.x + 5, doc.y + 7);
            doc.moveDown(2);

            // Questions Section
            doc.fontSize(14).font('Helvetica-Bold').text('Preguntas', { underline: true });
            doc.moveDown();

            questions.forEach((q, index) => {
                doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${q.questionText}`);
                doc.fontSize(8).font('Helvetica-Oblique').text(`Dificultad: ${q.difficulty}`, { align: 'right' });
                doc.moveDown(0.5);

                if (q.type === 'multiple_choice' && q.options) {
                    q.options.forEach((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        doc.fontSize(11).font('Helvetica').text(`   ${letter}) ${opt.text}`);
                    });
                } else if (q.type === 'true_false') {
                    doc.fontSize(11).font('Helvetica').text('   ( ) Verdadero');
                    doc.fontSize(11).font('Helvetica').text('   ( ) Falso');
                } else if (q.type === 'open') {
                    doc.moveDown();
                    doc.rect(doc.x + 20, doc.y, 450, 80).stroke();
                    doc.moveDown(5);
                }

                doc.moveDown();

                // Add page if needed
                if (doc.y > 650) {
                    doc.addPage();
                }
            });

            doc.end();

        } catch (error) {
            console.error('PDF Generation Error:', error);
            res.status(500).json({ message: 'Error generando PDF', error: error.message });
        }
    }

    // Submit evaluation for review
    static async submitEvaluation(req, res) {
        try {
            const evaluation = await Evaluation.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId, status: { $in: ['draft', 'rejected'] } },
                { status: 'submitted' },
                { new: true }
            );
            if (!evaluation) return res.status(404).json({ message: 'Evaluación no encontrada o no está en borrador.' });
            res.json(evaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Review evaluation (Approve/Reject)
    static async reviewEvaluation(req, res) {
        try {
            const { status, feedback } = req.body;
            const staffRoles = ['admin', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para revisar evaluaciones.' });
            }

            const evaluation = await Evaluation.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                { status, feedback, approvedBy: req.user.userId },
                { new: true }
            );

            if (!evaluation) return res.status(404).json({ message: 'Evaluación no encontrada' });

            // Notify students if newly approved
            if (status === 'approved') {
                NotificationService.notifyCourseAssessment(
                    evaluation.courseId,
                    evaluation.title,
                    evaluation.date,
                    evaluation.tenantId
                );
            }

            res.json(evaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

export default EvaluationController;
