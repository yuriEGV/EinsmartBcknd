import Evaluation from '../models/evaluationModel.js';
import NotificationService from '../services/notificationService.js';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';

class EvaluationController {
    // Create a new evaluation
    static async createEvaluation(req, res) {
        try {
            const staffRoles = ['admin', 'sostenedor', 'teacher', 'director', 'utp'];
            if (!staffRoles.includes(req.user.role)) {
                return res.status(403).json({ message: 'No tienes permisos para crear evaluaciones.' });
            }

            // Validate required fields
            const { courseId, subjectId, title } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({ message: 'El título es obligatorio.' });
            }

            if (!courseId || !subjectId) {
                return res.status(400).json({ message: 'Debe seleccionar un curso y una asignatura.' });
            }

            // Validate ObjectIDs (backend needs valid MongoDB IDs)
            const mongoose = await import('mongoose');
            if (!mongoose.default.Types.ObjectId.isValid(courseId)) {
                return res.status(400).json({ message: 'El ID del curso no es válido.' });
            }

            if (!mongoose.default.Types.ObjectId.isValid(subjectId)) {
                return res.status(400).json({ message: 'El ID de la asignatura no es válido.' });
            }

            const evaluation = new Evaluation({
                ...req.body,
                tenantId: req.user.tenantId
            });
            await evaluation.save();
            await evaluation.populate('courseId', 'name code');

            // Notify Students
            NotificationService.notifyCourseAssessment(
                evaluation.courseId._id,
                evaluation.title,
                evaluation.date,
                evaluation.tenantId
            );

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
            } else if (studentId || req.user.role === 'student') {
                const targetStudentId = studentId || req.user.profileId;
                const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
                const student = await Estudiante.findById(targetStudentId);
                if (student && student.courseId) {
                    query.courseId = student.courseId;
                } else if (student && student.grado) {
                    const Course = await import('../models/courseModel.js').then(m => m.default);
                    const course = await Course.findOne({ name: student.grado, tenantId: req.user.tenantId });
                    if (course) query.courseId = course._id;
                }
            } else if (guardianId || req.user.role === 'apoderado') {
                const targetGuardianId = guardianId || req.user.profileId;
                const Apoderado = await import('../models/apoderadoModel.js').then(m => m.default);
                const Estudiante = await import('../models/estudianteModel.js').then(m => m.default);
                const guardian = await Apoderado.findById(targetGuardianId);
                if (guardian && guardian.estudianteId) {
                    const student = await Estudiante.findById(guardian.estudianteId);
                    if (student && student.courseId) {
                        query.courseId = student.courseId;
                    }
                }
            }

            if (subjectId) query.subjectId = subjectId;

            const evaluations = await Evaluation.find(query)
                .populate('courseId', 'name code')
                .populate('subjectId', 'name')
                .populate('questions');

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
                .populate('courseId', 'name code');
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
                .populate('courseId', 'name code');
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
                .populate('courseId', 'name code');
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

            const evaluation = await Evaluation.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            )
                .populate('courseId', 'name code');
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(200).json(evaluation);
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
                .populate('questions');

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
}

export default EvaluationController;
